document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const dropZoneContent = document.querySelector('.drop-zone-content');
    const fileInfo = document.getElementById('file-info');
    const fileNameDisplay = document.getElementById('file-name');
    const fileSizeDisplay = document.getElementById('file-size');
    const removeFileBtn = document.getElementById('remove-file-btn');
    
    const modeEncrypt = document.getElementById('mode-encrypt');
    const modeDecrypt = document.getElementById('mode-decrypt');
    const dropText = document.getElementById('drop-text');
    const actionBtn = document.getElementById('action-btn');
    const actionText = document.getElementById('action-text');
    const actionIcon = actionBtn.querySelector('i');
    
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const togglePasswordIcon = togglePasswordBtn.querySelector('i');
    
    const statusMessage = document.getElementById('status-message');
    const statusText = document.getElementById('status-text');
    const statusIcon = statusMessage.querySelector('i');

    // State
    let currentFile = null;
    let currentMode = 'encrypt'; // 'encrypt' or 'decrypt'

    // Format bytes
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Toggle Mode
    function updateMode() {
        currentMode = modeEncrypt.checked ? 'encrypt' : 'decrypt';
        document.body.setAttribute('data-mode', currentMode);
        
        if (currentMode === 'encrypt') {
            dropText.textContent = 'Drop file to lock';
            actionText.textContent = 'Lock File';
            actionIcon.className = 'uil uil-lock';
        } else {
            dropText.textContent = 'Drop .locked file to unlock';
            actionText.textContent = 'Unlock File';
            actionIcon.className = 'uil uil-unlock';
        }
        clearFile();
        clearStatus();
    }

    modeEncrypt.addEventListener('change', updateMode);
    modeDecrypt.addEventListener('change', updateMode);

    // File Selection
    function handleFile(file) {
        if (currentMode === 'decrypt' && !file.name.endsWith('.locked')) {
            showStatus('Please select a .locked file for decryption.', 'error');
            return;
        }

        currentFile = file;
        fileNameDisplay.textContent = file.name;
        fileSizeDisplay.textContent = formatBytes(file.size);
        
        dropZoneContent.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        
        checkReadyState();
        clearStatus();
    }

    function clearFile() {
        currentFile = null;
        fileInput.value = '';
        dropZoneContent.classList.remove('hidden');
        fileInfo.classList.add('hidden');
        checkReadyState();
    }

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFile();
    });

    // Drag and Drop
    dropZone.addEventListener('click', () => {
        if (!currentFile) fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            if (!currentFile) dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        if (currentFile) return;
        let dt = e.dataTransfer;
        let files = dt.files;
        if (files.length > 0) handleFile(files[0]);
    });

    // Password Toggle
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordIcon.className = type === 'password' ? 'uil uil-eye' : 'uil uil-eye-slash';
    });

    // Check Readiness
    function checkReadyState() {
        if (currentFile && passwordInput.value.length > 0) {
            actionBtn.disabled = false;
        } else {
            actionBtn.disabled = true;
        }
    }

    passwordInput.addEventListener('input', checkReadyState);

    // Status Message
    function showStatus(text, type) {
        statusMessage.className = `status-message ${type}`;
        statusText.textContent = text;
        
        if (type === 'processing') {
            statusIcon.className = 'uil uil-spinner';
        } else if (type === 'success') {
            statusIcon.className = 'uil uil-check-circle';
        } else if (type === 'error') {
            statusIcon.className = 'uil uil-exclamation-circle';
        }
    }

    function clearStatus() {
        statusMessage.className = 'status-message hidden';
    }

    // --- Cryptography Core Logic ---

    // Utility to wait a bit so UI can update (Spinner rendering)
    const yieldToMain = () => new Promise(r => setTimeout(r, 50));

    async function processEncryption() {
        const password = passwordInput.value;
        const file = currentFile;
        
        try {
            showStatus('Reading file...', 'processing');
            actionBtn.disabled = true;
            await yieldToMain();

            const fileBuffer = await file.arrayBuffer();

            showStatus('Encrypting...', 'processing');
            await yieldToMain();

            // 1. Pack Metadata with File Content
            const metadata = { name: file.name, type: file.type };
            const metadataString = JSON.stringify(metadata);
            const metadataBytes = new TextEncoder().encode(metadataString);
            const metadataLength = metadataBytes.length;

            const lengthBuffer = new Uint8Array(4);
            new DataView(lengthBuffer.buffer).setUint32(0, metadataLength, true); // Little-endian

            const plaintext = new Uint8Array(4 + metadataLength + fileBuffer.byteLength);
            plaintext.set(lengthBuffer, 0);
            plaintext.set(metadataBytes, 4);
            plaintext.set(new Uint8Array(fileBuffer), 4 + metadataLength);

            // 2. Encryption
            const enc = new TextEncoder();
            const passwordKey = await crypto.subtle.importKey(
                "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
            );
            
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const aesKey = await crypto.subtle.deriveKey(
                { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
                passwordKey,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt"]
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ciphertextBuffer = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv }, aesKey, plaintext
            );

            const ciphertext = new Uint8Array(ciphertextBuffer);

            // 3. Assemble Output: [salt: 16][iv: 12][ciphertext]
            const finalPayload = new Uint8Array(16 + 12 + ciphertext.length);
            finalPayload.set(salt, 0);
            finalPayload.set(iv, 16);
            finalPayload.set(ciphertext, 28);

            // 4. Download
            showStatus('Zipping it up...', 'processing');
            await yieldToMain();

            const blob = new Blob([finalPayload], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name + '.locked';
            a.click();
            URL.revokeObjectURL(url);

            showStatus('File locked successfully!', 'success');
            setTimeout(clearFile, 2000);
            passwordInput.value = '';
            checkReadyState();

        } catch (error) {
            console.error(error);
            showStatus('Encryption failed! File might be too large.', 'error');
            actionBtn.disabled = false;
        }
    }

    async function processDecryption() {
        const password = passwordInput.value;
        const file = currentFile;
        
        try {
            showStatus('Reading file...', 'processing');
            actionBtn.disabled = true;
            await yieldToMain();

            const fileBuffer = await file.arrayBuffer();
            const dataBuffer = new Uint8Array(fileBuffer);

            if (dataBuffer.length < 28) {
                throw new Error("Invalid file format");
            }

            // 1. Unpack Header
            const salt = dataBuffer.slice(0, 16);
            const iv = dataBuffer.slice(16, 28);
            const ciphertext = dataBuffer.slice(28);

            showStatus('Decrypting...', 'processing');
            await yieldToMain();

            // 2. Decrypt
            const enc = new TextEncoder();
            const passwordKey = await crypto.subtle.importKey(
                "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
            );
            
            const aesKey = await crypto.subtle.deriveKey(
                { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
                passwordKey,
                { name: "AES-GCM", length: 256 },
                false,
                ["decrypt"]
            );

            let plaintextBuffer;
            try {
                plaintextBuffer = await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv }, aesKey, ciphertext
                );
            } catch (err) {
                // Decryption fails usually means wrong password or corrupted file
                showStatus('Unlock failed! Incorrect password.', 'error');
                actionBtn.disabled = false;
                return;
            }

            const plaintext = new Uint8Array(plaintextBuffer);

            // 3. Unpack Metadata
            const metadataLength = new DataView(plaintext.buffer).getUint32(0, true);
            const metadataBytes = plaintext.slice(4, 4 + metadataLength);
            
            let metadata;
            try {
                metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
            } catch (e) {
                metadata = { name: "unlocked_file", type: "application/octet-stream" };
            }

            const originalFileData = plaintext.slice(4 + metadataLength);

            showStatus('Restoring file...', 'processing');
            await yieldToMain();

            // 4. Download
            const blob = new Blob([originalFileData], { type: metadata.type });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = metadata.name;
            a.click();
            URL.revokeObjectURL(url);

            showStatus('File unlocked successfully!', 'success');
            setTimeout(clearFile, 2000);
            passwordInput.value = '';
            checkReadyState();

        } catch (error) {
            console.error(error);
            showStatus('Decryption failed! The file might be corrupted.', 'error');
            actionBtn.disabled = false;
        }
    }

    actionBtn.addEventListener('click', () => {
        if (currentMode === 'encrypt') {
            processEncryption();
        } else {
            processDecryption();
        }
    });

    // Handle form submission via enter key
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !actionBtn.disabled) {
            actionBtn.click();
        }
    });
});
