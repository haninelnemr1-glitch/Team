// ==================== FIREBASE SETUP (CDN Modules) ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
    getDatabase, 
    ref, 
    set, 
    onValue, 
    push, 
    remove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZPi-l_waTJ74xO9Fdb7SrZKTeT5w8IcQ",
    authDomain: "khotanakhadra.firebaseapp.com",
    databaseURL: "https://khotanakhadra-default-rtdb.firebaseio.com",
    projectId: "khotanakhadra",
    storageBucket: "khotanakhadra.firebasestorage.app",
    messagingSenderId: "319511365367",
    appId: "1:319511365367:web:5a0cf3f0ba6099f534b5f2",
    measurementId: "G-PKYBZ8TPBY"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// ==================== CONSTANTS & INITIAL DATA ====================
const ALLOWED_ROSTER = [
    "Hanin Elnemr", "Fahd", "Jody", "Kirols", "Lobna", "Malak", 
    "Nandy", "Noreen", "Nour", "Reem", "Remas", "Rokia", 
    "Sara", "Somia", "Tayseer", "Yassen", "Elzahraa"
];

const FOUNDER_NAME = "Hanin Elnemr";
const FOUNDER_PASSCODE = "727";
const FOUNDER_IMAGE_PATH = "771821083_18039026267815893_8617930397081388043_n.jpg";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let currentUser = JSON.parse(localStorage.getItem("khotana_current_user")) || null;
let tempAvatarData = "";
let tempEditAvatarData = "";

// ==================== REALTIME DATABASE SYNCHRONIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    populateRegisterRosterDropdown();
    checkAuthStatus();

    onValue(ref(db, "users"), (snapshot) => {
        const usersObj = snapshot.val() || {};
        const usersList = Object.values(usersObj);
        renderCommitteesRealtime(usersList);
    });

    onValue(ref(db, "activeQuestion"), (snapshot) => {
        const question = snapshot.val();
        renderActiveQuestionRealtime(question);
    });

    onValue(ref(db, "answers"), (snapshot) => {
        const answersObj = snapshot.val() || {};
        const now = Date.now();
        const validAnswers = [];

        Object.keys(answersObj).forEach(key => {
            const ans = answersObj[key];
            if (now - ans.timestamp < TWENTY_FOUR_HOURS_MS) {
                validAnswers.push(ans);
            } else {
                remove(ref(db, "answers/" + key));
            }
        });

        renderAnswersRealtime(validAnswers);
    });
});

// ==================== AUTHENTICATION & NAVIGATION ====================
window.checkAuthStatus = checkAuthStatus;
window.goToAuthStep = goToAuthStep;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.handleRegisterNameChange = handleRegisterNameChange;
window.toggleFounderPasscodeGroup = toggleFounderPasscodeGroup;
window.switchAvatarTab = switchAvatarTab;
window.previewAvatarFromFile = previewAvatarFromFile;
window.previewAvatarFromUrl = previewAvatarFromUrl;
window.handleAnswerSubmit = handleAnswerSubmit;
window.openPublishQuestionModal = openPublishQuestionModal;
window.closePublishQuestionModal = closePublishQuestionModal;
window.handlePublishQuestionSubmit = handlePublishQuestionSubmit;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.toggleEditFounderPasscodeGroup = toggleEditFounderPasscodeGroup;
window.switchEditAvatarTab = switchEditAvatarTab;
window.previewEditAvatarFromFile = previewEditAvatarFromFile;
window.previewEditAvatarFromUrl = previewEditAvatarFromUrl;
window.handleEditProfileSubmit = handleEditProfileSubmit;
window.handleLogout = handleLogout;

function checkAuthStatus() {
    const authModal = document.getElementById("authModal");
    const mainDashboard = document.getElementById("mainDashboard");

    if (currentUser) {
        authModal.classList.add("hidden");
        mainDashboard.classList.remove("hidden");
        renderDashboard();
    } else {
        authModal.classList.remove("hidden");
        mainDashboard.classList.add("hidden");
        goToAuthStep('init');
    }
}

function goToAuthStep(step) {
    document.getElementById("authStep0").classList.remove("active");
    document.getElementById("authStepLogin").classList.remove("active");
    document.getElementById("authStepRegister").classList.remove("active");

    const loginError = document.getElementById("loginError");
    const registerError = document.getElementById("registerError");
    if (loginError) loginError.classList.add("hidden");
    if (registerError) registerError.classList.add("hidden");

    if (step === 'init') document.getElementById("authStep0").classList.add("active");
    if (step === 'login') document.getElementById("authStepLogin").classList.add("active");
    if (step === 'register') document.getElementById("authStepRegister").classList.add("active");
}

function populateRegisterRosterDropdown() {
    const select = document.getElementById("regNameSelect");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>-- اختر اسمك --</option>';

    ALLOWED_ROSTER.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function handleRegisterNameChange(selectedName) {
    const isFounder = selectedName.toLowerCase().trim() === FOUNDER_NAME.toLowerCase().trim();
    const isFounderCheckbox = document.getElementById("regIsFounder");
    const committeeGroup = document.getElementById("committeeSelectGroup");
    const previewImg = document.getElementById("regAvatarPreview");
    
    if (isFounder) {
        isFounderCheckbox.checked = true;
        toggleFounderPasscodeGroup(true);
        committeeGroup.classList.add("hidden");
        previewImg.src = FOUNDER_IMAGE_PATH;
        tempAvatarData = FOUNDER_IMAGE_PATH;
    } else {
        isFounderCheckbox.checked = false;
        toggleFounderPasscodeGroup(false);
        committeeGroup.classList.remove("hidden");
        if (!tempAvatarData || tempAvatarData === FOUNDER_IMAGE_PATH) {
            previewImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedName)}&background=2d6a4f&color=fff`;
            tempAvatarData = previewImg.src;
        }
    }
}

function toggleFounderPasscodeGroup(isChecked) {
    const group = document.getElementById("founderPasscodeGroup");
    const committeeGroup = document.getElementById("committeeSelectGroup");
    
    if (isChecked) {
        group.classList.remove("hidden");
        committeeGroup.classList.add("hidden");
    } else {
        group.classList.add("hidden");
        committeeGroup.classList.remove("hidden");
    }
}

function switchAvatarTab(type) {
    const btnFile = document.getElementById("tabBtnFile");
    const btnUrl = document.getElementById("tabBtnUrl");
    const groupFile = document.getElementById("avatarFileInputGroup");
    const groupUrl = document.getElementById("avatarUrlInputGroup");

    if (type === 'file') {
        btnFile.classList.add("active");
        btnUrl.classList.remove("active");
        groupFile.classList.remove("hidden");
        groupUrl.classList.add("hidden");
    } else {
        btnUrl.classList.add("active");
        btnFile.classList.remove("active");
        groupUrl.classList.remove("hidden");
        groupFile.classList.add("hidden");
    }
}

function previewAvatarFromFile(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempAvatarData = e.target.result;
            document.getElementById("regAvatarPreview").src = tempAvatarData;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewAvatarFromUrl(url) {
    if (url.trim() !== "") {
        tempAvatarData = url.trim();
        document.getElementById("regAvatarPreview").src = tempAvatarData;
    }
}

function normalizeName(str) {
    return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const inputName = document.getElementById("loginNameInput").value;
    const normalizedInput = normalizeName(inputName);
    const errorBox = document.getElementById("loginError");

    const matchedRosterName = ALLOWED_ROSTER.find(name => normalizeName(name) === normalizedInput);

    if (!matchedRosterName) {
        errorBox.classList.remove("hidden");
        return;
    }

    onValue(ref(db, "users"), (snapshot) => {
        const usersObj = snapshot.val() || {};
        let user = Object.values(usersObj).find(u => normalizeName(u.name) === normalizedInput);

        if (!user) {
            const isFounder = matchedRosterName.toLowerCase() === FOUNDER_NAME.toLowerCase();
            const userId = matchedRosterName.replace(/\s+/g, "_").toLowerCase();
            user = {
                id: userId,
                name: matchedRosterName,
                avatar: isFounder ? FOUNDER_IMAGE_PATH : `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedRosterName)}&background=2d6a4f&color=fff`,
                committee: isFounder ? "" : "HR",
                isFounder: isFounder
            };
            set(ref(db, "users/" + userId), user);
        }

        currentUser = user;
        localStorage.setItem("khotana_current_user", JSON.stringify(currentUser));
        checkAuthStatus();
    }, { onlyOnce: true });
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById("registerError");
    errorBox.classList.add("hidden");

    const selectedName = document.getElementById("regNameSelect").value;
    const isFounderChecked = document.getElementById("regIsFounder").checked;
    const founderCode = document.getElementById("regFounderCode").value.trim();
    const committee = document.getElementById("regCommittee").value;

    if (!selectedName) {
        showError(errorBox, "برجاء اختيار اسمك من القائمة.");
        return;
    }

    let isFounder = false;
    if (isFounderChecked) {
        if (founderCode !== FOUNDER_PASSCODE) {
            showError(errorBox, "كود التحقق الخاص بالفاوندر غير صحيح!");
            return;
        }
        isFounder = true;
    }

    if (!isFounder && !committee) {
        showError(errorBox, "يرجى تحديد اللجنة التابع لها.");
        return;
    }

    let avatarUrl = isFounder ? FOUNDER_IMAGE_PATH : (tempAvatarData || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedName)}&background=2d6a4f&color=fff`);

    const userId = selectedName.replace(/\s+/g, "_").toLowerCase();
    const userProfile = {
        id: userId,
        name: selectedName,
        avatar: avatarUrl,
        committee: isFounder ? "" : committee,
        isFounder: isFounder
    };

    set(ref(db, "users/" + userId), userProfile).then(() => {
        currentUser = userProfile;
        localStorage.setItem("khotana_current_user", JSON.stringify(currentUser));
        checkAuthStatus();
    });
}

function showError(container, msg) {
    container.textContent = msg;
    container.classList.remove("hidden");
}

function renderDashboard() {
    if (!currentUser) return;

    document.getElementById("navUserName").textContent = currentUser.name;
    document.getElementById("navUserAvatar").src = currentUser.isFounder ? FOUNDER_IMAGE_PATH : currentUser.avatar;
    document.getElementById("navUserRole").textContent = currentUser.isFounder ? "مؤسس المبادرة" : `لجنة ${currentUser.committee}`;

    const founderControl = document.getElementById("founderQControl");
    if (currentUser.isFounder) {
        founderControl.classList.remove("hidden");
    } else {
        founderControl.classList.add("hidden");
    }

    renderFounderSection();
}

function renderFounderSection() {
    const founderPhoto = document.getElementById("founderPhoto");
    const founderName = document.getElementById("founderName");
    if (founderPhoto) founderPhoto.src = FOUNDER_IMAGE_PATH;
    if (founderName) founderName.textContent = FOUNDER_NAME;
}

function renderCommitteesRealtime(usersList) {
    const committees = ["HR", "Operations", "Activities", "Content Writing", "Graphic Design"];
    committees.forEach(comm => {
        const container = document.getElementById(`committeeList-${comm}`);
        if (!container) return;
        container.innerHTML = "";

        const members = usersList.filter(u => !u.isFounder && u.committee === comm);
        if (members.length === 0) {
            container.innerHTML = '<div class="empty-committee">لا يوجد أعضاء حالياً</div>';
        } else {
            members.forEach(member => {
                container.innerHTML += `
                    <div class="member-item">
                        <img src="${member.avatar}" class="member-avatar">
                        <span class="member-name">${member.name}</span>
                    </div>`;
            });
        }
    });
}

function renderActiveQuestionRealtime(question) {
    const qText = document.getElementById("displayQuestionText");
    const qMeta = document.getElementById("displayQuestionMeta");
    if (!qText) return;

    if (question && question.text) {
        qText.textContent = question.text;
        if (qMeta) {
            const dateStr = new Date(question.timestamp).toLocaleDateString("ar-EG", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            qMeta.innerHTML = `<i class="fa-solid fa-user"></i> نشر بواسطة الفاوندر - ${dateStr}`;
        }
    } else {
        qText.textContent = "لا يوجد سؤال مطروح حالياً من الفاوندر.";
        if (qMeta) qMeta.innerHTML = "";
    }
}

function renderAnswersRealtime(answersList) {
    const answersGrid = document.getElementById("answersGrid");
    const countBadge = document.getElementById("answersCountBadge");
    if (!answersGrid) return;

    answersGrid.innerHTML = "";
    if (countBadge) countBadge.textContent = `${answersList.length} إجابة`;

    if (answersList.length === 0) {
        answersGrid.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1/-1;">لا توجد إجابات بعد.</p>';
        return;
    }

    answersList.sort((a, b) => b.timestamp - a.timestamp).forEach(ans => {
        const timeAgo = formatTimeAgo(ans.timestamp);
        const isFounderTag = ans.isFounder ? '<span class="badge-founder-tag">مؤسس</span>' : '';
        const avatarSrc = ans.isFounder ? FOUNDER_IMAGE_PATH : ans.userAvatar;

        answersGrid.innerHTML += `
            <div class="answer-card">
                <div class="answer-user-info">
                    <img src="${avatarSrc}" class="answer-avatar">
                    <div><span class="answer-user-name">${ans.userName}</span> ${isFounderTag}</div>
                    <span class="answer-time">${timeAgo}</span>
                </div>
                <div class="answer-content">${escapeHTML(ans.text)}</div>
            </div>`;
    });
}

function handleAnswerSubmit(e) {
    e.preventDefault();
    const answerInput = document.getElementById("userAnswerText");
    const text = answerInput.value.trim();
    if (!text || !currentUser) return;

    const newAnswerRef = push(ref(db, "answers"));
    set(newAnswerRef, {
        id: newAnswerRef.key,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.isFounder ? FOUNDER_IMAGE_PATH : currentUser.avatar,
        isFounder: currentUser.isFounder,
        text: text,
        timestamp: Date.now()
    }).then(() => { answerInput.value = ""; });
}

function openPublishQuestionModal() {
    document.getElementById("publishQuestionModal").classList.remove("hidden");
}

function closePublishQuestionModal() {
    document.getElementById("publishQuestionModal").classList.add("hidden");
}

function handlePublishQuestionSubmit(e) {
    e.preventDefault();
    const text = document.getElementById("newQuestionInput").value.trim();
    if (!text) return;

    set(ref(db, "activeQuestion"), { text: text, timestamp: Date.now() }).then(() => {
        closePublishQuestionModal();
    });
}

function openEditProfileModal() {
    if (!currentUser) return;
    document.getElementById("editNameInput").value = currentUser.name;
    document.getElementById("editAvatarPreview").src = currentUser.isFounder ? FOUNDER_IMAGE_PATH : currentUser.avatar;
    document.getElementById("editIsFounder").checked = currentUser.isFounder;
    document.getElementById("editProfileModal").classList.remove("hidden");
}

function closeEditProfileModal() {
    document.getElementById("editProfileModal").classList.add("hidden");
}

function toggleEditFounderPasscodeGroup(isChecked) {
    document.getElementById("editFounderPasscodeGroup").classList.toggle("hidden", !isChecked);
    document.getElementById("editCommitteeGroup").classList.toggle("hidden", isChecked);
}

function handleEditProfileSubmit(e) {
    e.preventDefault();
    const isFounderChecked = document.getElementById("editIsFounder").checked;
    const founderCode = document.getElementById("editFounderCode").value.trim();
    const selectedCommittee = document.getElementById("editCommitteeSelect").value;

    let isFounder = currentUser.isFounder;
    if (isFounderChecked && !currentUser.isFounder) {
        if (founderCode !== FOUNDER_PASSCODE) {
            alert("كود التحقق غير صحيح!");
            return;
        }
        isFounder = true;
    } else if (!isFounderChecked) {
        isFounder = false;
    }

    currentUser.isFounder = isFounder;
    currentUser.committee = isFounder ? "" : selectedCommittee;

    set(ref(db, "users/" + currentUser.id), currentUser).then(() => {
        localStorage.setItem("khotana_current_user", JSON.stringify(currentUser));
        closeEditProfileModal();
        checkAuthStatus();
    });
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem("khotana_current_user");
    checkAuthStatus();
}

function formatTimeAgo(timestamp) {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return "منذ لحظات";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    return `منذ ${diffHours} ساعة`;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}