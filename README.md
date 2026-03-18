# File Locker

**Live Demo:** [https://secure-file-locker.netlify.app/](https://secure-file-locker.netlify.app)

## What is this project?
File Locker is a secure, client-side web application that allows you to encrypt and decrypt sensitive files directly within your browser. 

Using secure AES-256 encryption capabilities, File Locker ensures that your files are completely unreadable without the correct password. Because it operates entirely locally on your device, your files are never uploaded to any server, guaranteeing absolute privacy.

## Why use it?
- **Privacy First:** Your data never leaves your device. Total client-side processing means zero risk of data interception during transit.
- **Easy to Use:** A beautiful, drag-and-drop glassmorphism UI makes securing files effortless.
- **Strong Encryption:** Relies on robust, modern encryption logic to protect your files from unauthorized access.
- **No Installation Required:** Works right out of the box in any modern web browser.

## How it works
1. **To Lock a File (Encrypt):**
   - Ensure the "Lock" mode is selected.
   - Drag and drop (or browse for) the file you wish to protect.
   - Enter a strong password.
   - Click **Lock File**. The app will generate a `.locked` encrypted version of your file for you to download safely.

2. **To Unlock a File (Decrypt):**
   - Toggle the switch to "Unlock" mode.
   - Select your previously encrypted `.locked` file.
   - Enter the exact password used during encryption.
   - Click **Unlock File**. Your original file will be restored and downloaded.
