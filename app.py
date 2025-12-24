from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import shutil
import re
import unicodedata
import os
import sqlite3
from datetime import datetime
from werkzeug.utils import secure_filename


app = Flask(__name__, static_folder="static", template_folder="templates") 
app.secret_key = "mysecretkey" 
BASE_DIR = os.path.abspath(os.path.dirname(__file__)) 
# 📂 โฟลเดอร์รูปกิจกรรม (Event) 
EVENT_GALLERY = os.path.join(app.static_folder, "gallery") 
os.makedirs(EVENT_GALLERY, exist_ok=True) 
# 📂 โฟลเดอร์รูปโพสต์ (Announcements / Posts) 
UPLOAD_FOLDER = os.path.join(app.static_folder, "uploads") 
os.makedirs(UPLOAD_FOLDER, exist_ok=True) 
# บอก Flask ให้รู้ว่าเวลา upload รูปของโพสต์ ให้เก็บที่ uploads 
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER 
# ประเภทไฟล์ที่อนุญาต 
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

# db ตรางกิจกรรม

conn = sqlite3.connect("msd.db")
cur = conn.cursor()

cur.execute("PRAGMA foreign_keys = OFF")

# โครงสร้าง events ที่ถูกต้องและสมบูรณ์
cur.execute("""
CREATE TABLE IF NOT EXISTS events_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,       -- วันเริ่ม
    end_date TEXT,            -- วันจบ
    description TEXT,
    folder_name TEXT,         -- ชื่อโฟลเดอร์กิจกรรม
    color TEXT                -- สีป้ายในปฏิทิน
)
""")

# ย้ายข้อมูลเดิม (เฉพาะที่มีในตารางเก่า)
try:
    cur.execute("""
    INSERT INTO events_new (id, title, date, end_date, description, folder_name, color)
    SELECT id, title, date, end_date, description, folder_name, color
    FROM events

    """)
except Exception:
    print("⚠ ไม่มีข้อมูลตรงกันให้ย้าย ไม่เป็นไร")

# ลบตารางเก่าและแทนที่ด้วยตารางใหม่
cur.execute("DROP TABLE IF EXISTS events")
cur.execute("ALTER TABLE events_new RENAME TO events")

cur.execute("PRAGMA foreign_keys = ON")
conn.commit()
conn.close()

print("✔ อัปเดตโครงสร้าง events เรียบร้อย!")





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

@app.route("/admin")
def admin_redirect():
    return redirect("/admin/events")


@app.route("/activity_schedule")
def activity_schedule():
    return render_template("event.html")

@app.route("/club_organization_chart")
def club_organization_chart():
    return render_template("club_organization_chart.html")



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

# gallery
@app.route("/gallery")
def gallery():
    base_path = os.path.join(app.static_folder, "gallery")

    albums = []

    for folder in os.listdir(base_path):
        folder_path = os.path.join(base_path, folder)

        if os.path.isdir(folder_path):

            # ดึงวันที่แก้ไขโฟลเดอร์ล่าสุด
            timestamp = os.path.getmtime(folder_path)
            date_str = datetime.fromtimestamp(timestamp).strftime("%d/%m/%Y")


            images = [
                f"gallery/{folder}/{img}"
                for img in os.listdir(folder_path)
                if img.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
            ]

            albums.append({
                "folder": folder,
                "name": folder.replace("_", " ").title(),
                "images": images,
                "date": date_str   # ← ส่งให้ template ใช้
            })

    return render_template("gallery.html", albums=albums)



    #event
PINNED_TITLES = [
    "กิจกรรม MSD พิเศษ",
    "กิจกรรมสำคัญประจำปี"
]



def slugify(text):
    text = unicodedata.normalize('NFKD', text)
    text = re.sub(r"[^0-9A-Za-zก-ฮะ-์\s_-]", "", text)
    return text.strip().replace(" ", "_")[:80]


@app.route("/admin/add_event", methods=["POST"])
def add_event():
    title = request.form.get("title", "").strip()
    start_date = request.form.get("date")
    end_date = request.form.get("end_date") or start_date
    desc = request.form.get("description", "").strip()
    color = (
    request.form.get("color") or
    request.form.get("editColor"))

    files = request.files.getlist("gallery[]")

    if not title or not start_date:
        flash("กรุณากรอกข้อมูลให้ครบ")
        return redirect("/admin/events")

    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO events (title, date, end_date, description, color) VALUES (?, ?, ?, ?, ?)",
        (title, start_date, end_date, desc, color)
    )
    event_id = cur.lastrowid
    conn.commit()

    folder_name = f"{start_date}-{slugify(title)}-{event_id}"
    folder_path = os.path.join(EVENT_GALLERY, folder_name)
    os.makedirs(folder_path, exist_ok=True)

    cur.execute("UPDATE events SET folder_name=? WHERE id=?", (folder_name, event_id))
    conn.commit()
    conn.close()

    for f in files:
        if f.filename:
            filename = secure_filename(f.filename)
            f.save(os.path.join(folder_path, filename))

    return redirect("/admin/events")


@app.route("/admin/edit_event/<int:id>", methods=["POST"])
def edit_event(id):
    data = request.get_json()
    title = data.get("title", "").strip()
    start_date = data.get("start_date")
    end_date = data.get("end_date") or start_date
    desc = data.get("desc", "")
    color = data.get("color")


    new_folder_name = f"{start_date}-{slugify(title)}-{id}"

    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT folder_name FROM events WHERE id=?", (id,))
    row = cur.fetchone()
    old_folder_name = row[0] if row else ""

    old_path = os.path.join(EVENT_GALLERY, old_folder_name)
    new_path = os.path.join(EVENT_GALLERY, new_folder_name)

    if old_folder_name and os.path.exists(old_path):
        try:
            os.rename(old_path, new_path)
        except:
            pass

    cur.execute("""
        UPDATE events SET
            title=?, date=?, end_date=?, description=?, folder_name=?, color=?
        WHERE id=?
    """, (
        title, start_date, end_date, desc, new_folder_name, color, id
    ))
    conn.commit()
    conn.close()

    return "", 204


@app.route("/event/<folder_name>")
def event_detail(folder_name):
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT id, title, date, end_date, description FROM events WHERE folder_name=?", (folder_name,))
    event = cur.fetchone()
    conn.close()

    if not event:
        return "ไม่พบกิจกรรม", 404

    event_id, title, start_date, end_date, desc = event

    folder_path = os.path.join(EVENT_GALLERY, folder_name)
    images = []
    if os.path.isdir(folder_path):
        images = [f for f in os.listdir(folder_path)
                  if f.lower().endswith((".jpg", ".jpeg", ".png", ".gif"))]

    return render_template(
        "event_detail.html",
        title=title,
        start_date=start_date,
        end_date=end_date,
        desc=desc,
        images=images,
        folder=folder_name
    )



@app.route("/get_events")
def get_events():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            title,
            COALESCE(description, ''),
            date AS start_date,
            COALESCE(end_date, date) AS end_date,
            COALESCE(folder_name, ''),
            color
        FROM events
        ORDER BY date ASC, id ASC

    """)

    rows = cur.fetchall()
    conn.close()

    events = []
    for r in rows:
        events.append({
            "id": r[0],
            "title": r[1],
            "desc": r[2],
            "start_date": r[3],
            "end_date": r[4],
            "folder": r[5],
            "color": r[6]
        })

    return jsonify(events)




def ensure_event_columns():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(events)")
    cols = [c[1] for c in cur.fetchall()]

    if "folder_name" not in cols:
        cur.execute("ALTER TABLE events ADD COLUMN folder_name TEXT")
        print("เพิ่ม column folder_name สำเร็จ!")

    if "end_date" not in cols:
        cur.execute("ALTER TABLE events ADD COLUMN end_date TEXT")
        print("เพิ่ม column end_date สำเร็จ!")

    if "color" not in cols:
        cur.execute("ALTER TABLE events ADD COLUMN color TEXT")
        print("เพิ่ม column color สำเร็จ!")

    conn.commit()
    conn.close()


def fix_missing_event_data():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()

    # end_date ว่าง → ใส่ start_date
    cur.execute("""
        UPDATE events
        SET end_date = date
        WHERE end_date IS NULL OR end_date = ''
    """)

    # folder_name ว่าง → สร้างใหม่
    cur.execute("SELECT id, title, date FROM events WHERE folder_name IS NULL OR folder_name = ''")
    rows = cur.fetchall()

    for id, title, start_date in rows:
        folder_name = f"{start_date}-{slugify(title)}-{id}"
        cur.execute("UPDATE events SET folder_name=? WHERE id=?", (folder_name, id))

    conn.commit()
    conn.close()
    print("🧩 ซ่อมข้อมูล event ที่หายครบแล้ว!")


fix_missing_event_data()
ensure_event_columns()



@app.route("/admin/events")
def admin_events():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, date, COALESCE(end_date, date), 
               COALESCE(description,''), COALESCE(folder_name,''), COALESCE(color,'#f97316')
        FROM events
        ORDER BY id DESC
    """)
    rows = cur.fetchall()
    conn.close()

    events = []
    for r in rows:
        events.append({
            "id": r[0],
            "title": r[1],
            "start_date": r[2],
            "end_date": r[3],
            "desc": r[4],
            "folder": r[5],
            "color": r[6]
        })

    return render_template("admin.html", events=events)



@app.route("/admin/delete_event/<int:id>", methods=["POST"])
def delete_event(id):
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT folder_name FROM events WHERE id=?", (id,))
    row = cur.fetchone()
    
    if not row:
        conn.close()
        return redirect("/admin/events")
    
    folder_name = row[0]
    
    # ลบรูปในโฟลเดอร์ถ้ามี
    if folder_name:
        folder_path = os.path.join("static", "gallery", folder_name)
        if os.path.exists(folder_path):
            try:
                shutil.rmtree(folder_path)
            except Exception as e:
                print("⚠ Error deleting folder:", e)

    # ลบข้อมูล DB
    cur.execute("DELETE FROM events WHERE id=?", (id,))
    conn.commit()
    conn.close()

    return redirect("/admin/events")




if __name__ == "__main__":
    import os
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )

