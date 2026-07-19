// NEW: Safely extracts usernames regardless of which Instagram JSON structure it is
function extractUsernames(data) {
    let usernames = new Set();
    function search(obj) {
        if (!obj) return;
        if (typeof obj === 'object') {
            if (obj.string_list_data && Array.isArray(obj.string_list_data)) {
                obj.string_list_data.forEach(item => {
                    // Method 1: The username is in "value" (followers_1.json style)
                    if (item.value && item.value !== "") {
                        usernames.add(item.value);
                    } 
                    // Method 2: The username is in "title" (following.json style)
                    else if (obj.title && obj.title !== "") {
                        usernames.add(obj.title);
                    }
                });
            }
            Object.values(obj).forEach(search);
        }
    }
    search(data);
    return Array.from(usernames);
}

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try { resolve(JSON.parse(reader.result)); } 
            catch (e) { reject("Invalid JSON"); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processFiles() {
    const fileInput = document.getElementById('dataFiles');
    const btn = document.getElementById('analyzeBtn');

    if (fileInput.files.length === 0) {
        alert("Please select your Instagram ZIP or JSON files.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `
        <div style="position: relative; z-index: 10;">Analyzing Data <span id="progressText">0%</span></div>
        <div id="progressBar" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(255,255,255,0.25); border-radius: inherit; transition: width 0.3s ease; z-index: 1;"></div>
    `;

    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');

    function updateProgress(percent) {
        progressText.innerText = `${percent}%`;
        progressBar.style.width = `${percent}%`;
    }

    try {
        await delay(100);
        updateProgress(10);

        let allFollowers = [];
        let allFollowing = [];

        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            
            // IF ZIP FILE
            if (file.name.toLowerCase().endsWith('.zip')) {
                if (typeof JSZip === 'undefined') throw new Error("JSZip did not load.");
                
                updateProgress(20);
                await delay(100);

                const zip = new JSZip();
                const contents = await zip.loadAsync(file);
                
                updateProgress(40);
                await delay(100);

                let fileCount = Object.keys(contents.files).length;
                let processed = 0;

                for (const [fullPath, zipEntry] of Object.entries(contents.files)) {
                    processed++;
                    
                    const baseName = fullPath.split('/').pop().toLowerCase();

                    if (processed % 30 === 0) {
                        let currentPercent = 40 + Math.floor((processed / fileCount) * 45);
                        updateProgress(currentPercent);
                        await delay(10); 
                    }

                    if (!zipEntry.dir && baseName.endsWith('.json')) {
                        if (baseName.includes('follower')) {
                            const textData = await zipEntry.async("string");
                            try { allFollowers = allFollowers.concat(extractUsernames(JSON.parse(textData))); } catch(e) {}
                        } else if (baseName.includes('following')) {
                            const textData = await zipEntry.async("string");
                            try { allFollowing = allFollowing.concat(extractUsernames(JSON.parse(textData))); } catch(e) {}
                        }
                    }
                }
            } 
            // IF JSON FILE
            else if (file.name.toLowerCase().endsWith('.json')) {
                updateProgress(45);
                const json = await readFileAsync(file);
                const extracted = extractUsernames(json);
                const baseName = file.name.toLowerCase();
                
                if (baseName.includes('follower')) {
                    allFollowers = allFollowers.concat(extracted);
                } else if (baseName.includes('following')) {
                    allFollowing = allFollowing.concat(extracted);
                }
            }
        }

        updateProgress(90);
        await delay(200);

        // Remove any duplicates
        allFollowers = [...new Set(allFollowers)];
        allFollowing = [...new Set(allFollowing)];

        if (allFollowers.length === 0 && allFollowing.length === 0) {
            alert("No follower/following data found. Make sure you selected the official Instagram export.");
            btn.innerHTML = "Analyze Data";
            btn.disabled = false;
            return;
        }

        const followersSet = new Set(allFollowers);
        const followingSet = new Set(allFollowing);

        const notFollowingBack = allFollowing.filter(user => !followersSet.has(user));
        const fans = allFollowers.filter(user => !followingSet.has(user));
        const mutuals = allFollowing.filter(user => followersSet.has(user));

        localStorage.setItem('notFollowingBack', JSON.stringify(notFollowingBack));
        localStorage.setItem('fans', JSON.stringify(fans));
        localStorage.setItem('mutuals', JSON.stringify(mutuals));

        updateProgress(100);
        await delay(300);

        loadDashboardStats();
        btn.innerHTML = "Data Synchronized!";
        
        setTimeout(() => {
            btn.innerHTML = "Analyze Data";
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        alert("Error processing files: " + error.message);
        btn.innerHTML = "Analyze Data";
        btn.disabled = false;
    }
}

function loadDashboardStats() {
    const notFollowingBack = JSON.parse(localStorage.getItem('notFollowingBack') || '[]');
    const fans = JSON.parse(localStorage.getItem('fans') || '[]');
    const mutuals = JSON.parse(localStorage.getItem('mutuals') || '[]');

    const el1 = document.getElementById('count-not-following');
    const el2 = document.getElementById('count-fans');
    const el3 = document.getElementById('count-mutuals');

    if(el1) el1.innerText = notFollowingBack.length;
    if(el2) el2.innerText = fans.length;
    if(el3) el3.innerText = mutuals.length;
}

function renderListPage(storageKey) {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const listContainer = document.getElementById('data-list');
    
    if (data.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No users found or data not loaded.</div>';
        return;
    }
    
    listContainer.innerHTML = data.map(user => `<div class="list-item">${user}</div>`).join('');
}