# Pastebin Lite 📝

Pastebin Lite is a simple web application that allows users to create and share text pastes with optional **expiration time (TTL)** and **maximum views**, similar to Pastebin.  

It has a clean frontend (HTML/CSS/JS) and a backend using **Node.js + Express + SQLite**.

---

##  Features

-  Create and store text pastes  
-  Optional TTL — paste auto-expires after a set time  
-  Optional Max Views — paste disappears after a number of views  
-  Shareable paste links  
-  Persistent storage using SQLite  
-  Safe rendering of content (prevents HTML injection)  

---

##  Technologies Used

### Frontend
- HTML5  
- CSS3  
- JavaScript (Vanilla JS)  
- Fetch API  

### Backend
- Node.js  
- Express.js — handles routes, middleware, and server  
- better-sqlite3 — database for pastes  
- nanoid — unique paste IDs  
- CORS — allow cross-origin requests  

### Storage
- SQLite database (`pastes.db`)  

---

## Project Structure

