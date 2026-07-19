function extractUsernames(data) {
    let usernames = [];
    function search(obj) {
        if (!obj) return;
        if (typeof obj === 'object') {
            if (obj.string_list_data && Array.isArray(obj.string_list_data)) {
                obj.string_list_data.forEach(item => {
                    if (item.value) usernames.push(item.value);
                });
            }
            Object.values(obj).forEach(search);
        }
    }
    search(data);
    return usernames;
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

async function processFiles() {
    const fileInput = document.getElementById('jsonFiles');

    if (fileInput.files.length === 0) {
        alert("Please select your JSON files.");
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    btn.innerText = "Scanning Data...";
    btn.style.opacity = "0.7";

    try {
        let followersArr = [];
        let followingArr = [];

        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const json = await readFileAsync(file);
            const extracted = extractUsernames(json);
            
            if (file.name.toLowerCase().includes('follower')) {
                followersArr = followersArr.concat(extracted);
            } else if (file.name.toLowerCase().includes('following')) {
                followingArr = followingArr.concat(extracted);
            }
        }

        if (followersArr.length === 0 && followingArr.length === 0) {
            alert("No follower/following data found. Make sure you selected the correct Instagram JSONs.");
            btn.innerText = "Analyze Data";
            btn.style.opacity = "1";
            return;
        }

        const followersSet = new Set(followersArr);
        const followingSet = new Set(followingArr);

        const notFollowingBack = followingArr.filter(user => !followersSet.has(user));
        const fans = followersArr.filter(user => !followingSet.has(user));
        const mutuals = followingArr.filter(user => followersSet.has(user));

        localStorage.setItem('notFollowingBack', JSON.stringify(notFollowingBack));
        localStorage.setItem('fans', JSON.stringify(fans));
        localStorage.setItem('mutuals', JSON.stringify(mutuals));

        loadDashboardStats();
        btn.innerText = "Data Synchronized!";
        setTimeout(() => {
            btn.innerText = "Analyze Data";
            btn.style.opacity = "1";
        }, 2000);

    } catch (error) {
        alert("Error processing files.");
        btn.innerText = "Analyze Data";
        btn.style.opacity = "1";
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