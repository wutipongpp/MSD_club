from flask import Flask, render_template, request, jsonify
import os
import sqlite3
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder="static", template_folder="templates")

# 📂 โฟลเดอร์เก็บรูป
UPLOAD_FOLDER = os.path.join(app.static_folder, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ✅ ประเภทไฟล์ที่อนุญาต
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ================================
# 🧱 ส่วนฐานข้อมูล
# ================================
DB_FILE = "msd.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

with get_db() as db:
    # ตารางรุ่นศิษย์เก่า
    db.execute("""
    CREATE TABLE IF NOT EXISTS alumni_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT UNIQUE NOT NULL
    )
    """)

    # ตารางสมาชิกศิษย์เก่า
    db.execute("""
    CREATE TABLE IF NOT EXISTS alumni_people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_year TEXT,
        student_id TEXT,
        name TEXT,
        contact TEXT,
        quote TEXT,
        image TEXT
    )
    """)
    db.commit()

with get_db() as db:
    db.execute("""
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    );
    """)
    db.commit()

# ================================
# 🌐 ROUTES (หน้าเว็บ)
# ================================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/alumni')
def alumni():
    return render_template('alumni.html')

@app.route('/announcements')
def announcements():
    return render_template('announcements.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/post/<int:post_id>')
def posts(post_id):
    return render_template('post.html', post_id=post_id)

@app.route("/alumni/profile/<student_id>")
def alumni_profile(student_id):
    return render_template("alumni_profile.html", student_id=student_id)

# 📄 ดึงข้อมูลศิษย์เก่าแบบรายคน (ใช้ student_id)
@app.route("/api/alumni/people/<student_id>", methods=["GET"])
def get_alumnus_by_id(student_id):
    """ดึงข้อมูลศิษย์เก่ารายคนตาม student_id"""
    with get_db() as db:
        row = db.execute("SELECT * FROM alumni_people WHERE student_id = ?", (student_id,)).fetchone()
        if not row:
            return jsonify({"error": "Alumnus not found"}), 404

        alumnus = dict(row)
        if alumnus["image"]:
            alumnus["image"] = f"/static/alumni_photos/{alumnus['image']}"
        return jsonify(alumnus), 200



# ================================
# 📤 อัปโหลดรูป (ใช้ใน admin)
# ================================
@app.route("/upload", methods=["POST"])
def upload_file():
    if "files[]" not in request.files:
        return jsonify({"error": "No file part"}), 400

    files = request.files.getlist("files[]")
    uploaded_urls = []

    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            unique_name = f"{timestamp}_{filename}"
            save_path = os.path.join(UPLOAD_FOLDER, unique_name)
            file.save(save_path)

            file_url = f"/static/uploads/{unique_name}"
            uploaded_urls.append(file_url)

    return jsonify({"uploaded": uploaded_urls})


# ================================
# 🧩 API สำหรับโพสต์
# ================================

# ➕ เพิ่มโพสต์ใหม่
@app.route("/api/posts", methods=["POST"])
def add_post():
    title = request.form.get("title")
    content = request.form.get("content")
    file = request.files.get("image")

    filename = None
    if file and allowed_file(file.filename):
        safe_name = secure_filename(file.filename)
        filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{safe_name}"
        file.save(os.path.join(UPLOAD_FOLDER, filename))

    with get_db() as db:
        db.execute(
            "INSERT INTO posts (title, content, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (title, content, filename, datetime.now(), datetime.now())
        )
        db.commit()
    return jsonify({"message": "post added"}), 201


# 📜 ดึงโพสต์ทั้งหมด
@app.route("/api/posts", methods=["GET"])
def get_posts():
    with get_db() as db:
        rows = db.execute("SELECT * FROM posts ORDER BY id DESC").fetchall()
        posts = [dict(r) for r in rows]
        # เพิ่ม URL เต็มให้ภาพ
        for p in posts:
            if p["image"]:
                p["image"] = f"/static/uploads/{p['image']}"
    return jsonify(posts)

@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    """ลบโพสต์ออกจากฐานข้อมูล และลบไฟล์รูปออกจาก static/uploads"""
    with get_db() as db:
        # ดึงข้อมูลโพสต์ก่อนลบ
        post = db.execute("SELECT image FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not post:
            return jsonify({"error": "Post not found"}), 404

        # ถ้ามีรูป → ลบไฟล์
        if post["image"]:
            file_path = os.path.join(UPLOAD_FOLDER, post["image"])
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"⚠️ ลบไฟล์ไม่สำเร็จ: {e}")

        # ลบโพสต์ในฐานข้อมูล
        db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        db.commit()

    return jsonify({"message": "deleted"}), 200



# ================================
# 🧩 API ระบบศิษย์เก่า (Alumni)
# ================================

# 📥 ดึงรุ่นทั้งหมด
@app.route("/api/alumni/batches", methods=["GET"])
def get_batches():
    with get_db() as db:
        rows = db.execute("SELECT year FROM alumni_batches ORDER BY year DESC").fetchall()
        return jsonify([r["year"] for r in rows])


# ➕ เพิ่มรุ่นใหม่
@app.route("/api/alumni/batches", methods=["POST"])
def add_batch():
    data = request.get_json()
    year = data.get("year")
    if not year:
        return jsonify({"error": "Missing year"}), 400

    with get_db() as db:
        try:
            db.execute("INSERT INTO alumni_batches (year) VALUES (?)", (year,))
            db.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "Batch already exists"}), 409

    return jsonify({"message": "Batch added"}), 201


# 📥 ดึงรายชื่อศิษย์เก่าทั้งหมด
@app.route("/api/alumni/people", methods=["GET"])
def get_alumni():
    with get_db() as db:
        rows = db.execute("SELECT * FROM alumni_people ORDER BY id DESC").fetchall()
        alumni = [dict(r) for r in rows]
        for a in alumni:
            if a["image"]:
                a["image"] = f"/static/alumni_photos/{a['image']}"
        return jsonify(alumni)


# ➕ เพิ่มศิษย์เก่าใหม่
@app.route("/api/alumni/people", methods=["POST"])
def add_alumnus():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Missing name"}), 400

    with get_db() as db:
        db.execute("""
        INSERT INTO alumni_people (batch_year, student_id, name, contact, quote, image)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data.get("batch"),
            data.get("student_id"),
            data.get("name"),
            data.get("contact"),
            data.get("quote"),
            data.get("image").replace("/static/alumni_photos/", "") if data.get("image") else None
        ))
        db.commit()

    return jsonify({"message": "Alumnus added"}), 201


# ✏️ แก้ไขศิษย์เก่า
@app.route("/api/alumni/people/<student_id>", methods=["PUT"])
def update_alumnus(alumni_id):
    data = request.get_json()
    with get_db() as db:
        db.execute("""
        UPDATE alumni_people
        SET student_id=?, name=?, contact=?, quote=?, image=?
        WHERE id=?
        """, (
            data.get("student_id"),
            data.get("name"),
            data.get("contact"),
            data.get("quote"),
            data.get("image").replace("/static/alumni_photos/", "") if data.get("image") else None,
            alumni_id
        ))
        db.commit()
    return jsonify({"message": "Updated"}), 200


# 🗑️ ลบศิษย์เก่า
@app.route("/api/alumni/people/<int:alumni_id>", methods=["DELETE"])
def delete_alumnus(alumni_id):
    """ลบศิษย์เก่าออกจากฐานข้อมูล พร้อมลบไฟล์รูป"""
    with get_db() as db:
        person = db.execute("SELECT image FROM alumni_people WHERE id = ?", (alumni_id,)).fetchone()
        if not person:
            return jsonify({"error": "Not found"}), 404

        # ถ้ามีรูป → ลบออกจาก static/alumni_photos/
        if person["image"]:
            file_path = os.path.join(app.static_folder, "alumni_photos", person["image"])
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"⚠️ ลบไฟล์รูปไม่สำเร็จ: {e}")

        # ลบจากฐานข้อมูล
        db.execute("DELETE FROM alumni_people WHERE id = ?", (alumni_id,))
        db.commit()

    return jsonify({"message": "Deleted"}), 200


@app.route("/api/alumni/batches", methods=["DELETE"])
def delete_batch():
    """ลบรุ่น พร้อมลบศิษย์เก่าทั้งหมดในรุ่นนั้น และไฟล์รูป"""
    data = request.get_json(silent=True) or {}
    year = data.get("year")

    if not year:
        return jsonify({"error": "Missing year"}), 400

    with get_db() as db:
        # 🔹 1. ดึงรายชื่อศิษย์เก่าในรุ่นนั้นก่อน
        members = db.execute(
            "SELECT image FROM alumni_people WHERE batch_year = ?", (year,)
        ).fetchall()

        # 🔹 2. ลบไฟล์รูปของศิษย์เก่าในรุ่นนั้น (ถ้ามี)
        for m in members:
            if m["image"]:
                file_path = os.path.join(app.static_folder, "alumni_photos", m["image"])
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        print(f"🗑️ ลบรูป: {file_path}")
                    except Exception as e:
                        print(f"⚠️ ไม่สามารถลบรูป {file_path}: {e}")

        # 🔹 3. ลบข้อมูลศิษย์เก่าทั้งหมดในรุ่นนั้น
        db.execute("DELETE FROM alumni_people WHERE batch_year = ?", (year,))

        # 🔹 4. ลบข้อมูลรุ่นออกจากตาราง batches
        db.execute("DELETE FROM alumni_batches WHERE year = ?", (year,))
        db.commit()

    print(f"✅ ลบรุ่น {year} และศิษย์เก่าทั้งหมดในรุ่นนี้เรียบร้อย")
    return jsonify({"message": f"Batch {year} and all members deleted"}), 200


# ================================
# 👨‍🎓 API สำหรับข้อมูลศิษย์เก่า
# ================================

# สร้างตารางเก็บศิษย์เก่า
with get_db() as db:
    db.execute("""
    CREATE TABLE IF NOT EXISTS alumni (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_year TEXT,
        student_id TEXT,
        name TEXT,
        contact TEXT,
        quote TEXT,
        image TEXT,
        created_at TEXT
    )
    """)
    db.commit()

@app.route("/api/alumni/batches", methods=["GET"])
def get_alumni_batches():
    """ดึงรายชื่อรุ่นทั้งหมด"""
    with get_db() as db:
        rows = db.execute("SELECT DISTINCT batch_year FROM alumni ORDER BY batch_year DESC").fetchall()
    return jsonify([r["batch_year"] for r in rows])

@app.route("/api/alumni/people", methods=["GET"])
def get_all_alumni():
    """ดึงรายชื่อศิษย์เก่าทั้งหมด"""
    with get_db() as db:
        rows = db.execute("SELECT * FROM alumni ORDER BY batch_year DESC, student_id ASC").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/alumni/people", methods=["POST"])
def add_alumni():
    """เพิ่มศิษย์เก่าใหม่"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing data"}), 400

    with get_db() as db:
        db.execute("""
            INSERT INTO alumni (batch_year, student_id, name, contact, quote, image, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("batch"),
            data.get("student_id"),
            data.get("name"),
            data.get("contact"),
            data.get("quote"),
            data.get("image"),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))
        db.commit()

    return jsonify({"message": "Alumni added successfully"}), 201

# ============= เพิ่มตาราง (วางใกล้ ๆ ตาราง posts) =============
with get_db() as db:
    db.execute("""
    CREATE TABLE IF NOT EXISTS alumni (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_year TEXT,
        student_id TEXT,
        name TEXT,
        contact TEXT,
        quote TEXT,
        image TEXT,                -- เก็บเป็น URL ตรง ๆ เช่น /static/alumni_photos/xxxxx.jpg
        created_at TEXT
    )
    """)
    db.execute("""
    CREATE TABLE IF NOT EXISTS alumni_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT UNIQUE NOT NULL
    )
    """)
    db.commit()

# ============= API ศิษย์เก่า =============
# รุ่นทั้งหมด (สำหรับ dropdown/การ์ด)
@app.route("/api/alumni/batches", methods=["GET"])
def api_get_batches():
    with get_db() as db:
        rows = db.execute("SELECT year FROM alumni_batches ORDER BY year DESC").fetchall()
    return jsonify([r["year"] for r in rows])

@app.route("/api/alumni/batches", methods=["POST"])
def api_add_batch():
    data = request.get_json(silent=True) or {}
    year = (data.get("year") or "").strip()
    if not year:
        return jsonify({"error": "Missing year"}), 400
    try:
        with get_db() as db:
            db.execute("INSERT INTO alumni_batches (year) VALUES (?)", (year,))
            db.commit()
        return jsonify({"message": "Batch added"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Batch already exists"}), 409

# ดึงรายชื่อศิษย์เก่าทั้งหมด
@app.route("/api/alumni/people", methods=["GET"])
def api_get_alumni():
    with get_db() as db:
        rows = db.execute("SELECT * FROM alumni ORDER BY batch_year DESC, student_id ASC").fetchall()
    return jsonify([dict(r) for r in rows])

# เพิ่มศิษย์เก่า
@app.route("/api/alumni/people", methods=["POST"])
def api_add_alumnus():
    data = request.get_json(silent=True) or {}
    # ตรวจขั้นต่ำ
    if not data.get("name") or not data.get("batch"):
        return jsonify({"error": "Missing required fields"}), 400

    with get_db() as db:
        db.execute("""
            INSERT INTO alumni (batch_year, student_id, name, contact, quote, image, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("batch"),
            data.get("student_id"),
            data.get("name"),
            data.get("contact"),
            data.get("quote"),
            data.get("image") or "",  # เก็บ URL ตรง ๆ (เช่น /static/alumni_photos/xxx.jpg)
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))
        db.commit()
    return jsonify({"message": "Alumnus added"}), 201

# ================================
# 📸 อัปโหลด/ลบรูปศิษย์เก่า
# ================================

@app.route("/upload_alumni", methods=["POST"])
def upload_alumni_image():
    """อัปโหลดรูปศิษย์เก่า — เก็บใน static/alumni_photos"""
    if "image" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["image"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # ตรวจสอบประเภทไฟล์
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Invalid file type: .{ext}"}), 400

    # สร้างโฟลเดอร์ถ้ายังไม่มี
    folder = os.path.join(app.static_folder, "alumni_photos")
    os.makedirs(folder, exist_ok=True)

    # ตั้งชื่อไฟล์ใหม่
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_name = secure_filename(file.filename)
    unique_name = f"{timestamp}_{safe_name}"
    save_path = os.path.join(folder, unique_name)
    file.save(save_path)

    return jsonify({"url": f"/static/alumni_photos/{unique_name}"}), 200


@app.route("/delete_alumni_image", methods=["POST"])
def delete_alumni_image():
    """ลบรูปศิษย์เก่าที่อัปโหลดไว้"""
    data = request.get_json(silent=True) or {}
    image_url = data.get("url", "")

    if not image_url.startswith("/static/alumni_photos/"):
        return jsonify({"error": "Invalid image path"}), 400

    # แปลงเป็น path จริง
    file_path = image_url.replace("/static/", os.path.join(app.static_folder, ""))
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return jsonify({"message": "Deleted"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"message": "File not found"}), 404


@app.route("/api/alumni/batches", methods=["GET"])
def get_batches_fixed():
    """✅ ดึงรายชื่อรุ่นทั้งหมดจาก alumni_batches"""
    with get_db() as db:
        # ตรวจสอบว่ามีตารางนี้อยู่จริง (กัน error)
        db.execute("""
        CREATE TABLE IF NOT EXISTS alumni_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year TEXT UNIQUE NOT NULL
        )
        """)
        db.commit()

        rows = db.execute("SELECT year FROM alumni_batches ORDER BY year DESC").fetchall()
        years = [r["year"] for r in rows]

    return jsonify(years)


if __name__ == "__main__":
    app.run(debug=True)
