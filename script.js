const map = document.getElementById('map');
let bbox = {
    topLeft: { lat: 35.70000, lng: 139.70000 },
    bottomRight: { lat: 35.68000, lng: 139.72000 }
};
let currentMarker = null;
let isAddPinMode = false;


// 画像読み込み
function loadImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const dataUrl = e.target.result;
        map.style.backgroundImage = `url('${dataUrl}')`;
        localStorage.setItem("mapImage", dataUrl);
    };
    reader.readAsDataURL(file);
}

// 緯度経度更新＋保存
function updateBBox() {
    const lat1 = document.getElementById('lat1').value;
    const lng1 = document.getElementById('lng1').value;
    const lat2 = document.getElementById('lat2').value;
    const lng2 = document.getElementById('lng2').value;

    bbox.topLeft.lat = parseFloat(lat1);
    bbox.topLeft.lng = parseFloat(lng1);
    bbox.bottomRight.lat = parseFloat(lat2);
    bbox.bottomRight.lng = parseFloat(lng2);

    localStorage.setItem("lat1", lat1);
    localStorage.setItem("lng1", lng1);
    localStorage.setItem("lat2", lat2);
    localStorage.setItem("lng2", lng2);
}

// 緯度経度 → ピクセル座標
function latLngToPixel(lat, lng) {
    updateBBox();
    const rect = map.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const x = ((lng - bbox.topLeft.lng) / (bbox.bottomRight.lng - bbox.topLeft.lng)) * width;
    const y = ((bbox.topLeft.lat - lat) / (bbox.topLeft.lat - bbox.bottomRight.lat)) * height;
    return { x, y };
}

// ピン表示
function addMarker(lat, lng, isPixel = false, color = 'blue', id = '') {

    if (currentMarker && !isPixel) currentMarker.remove();
    const { x, y } = latLngToPixel(lat, lng);
    const marker = document.createElement('div');
    let longPressTimer = null;
    marker.className = 'marker';
    marker.id = isPixel ? id : "Target";
    marker.style.background = color;
    marker.style.left = `${!isPixel ? x : lat}px`;
    marker.style.top = `${!isPixel ? y : lng}px`;
    marker.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        if (confirm("このピンを削除しますか？")) {
            const labelId = document.getElementById(marker.id);
            marker.remove();
            if (labelId) labelId.remove();
            saveMarkers();
            saveLabels();
        }
    });
    // 長押し検出（スマホ用）
    marker.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        longPressTimer = setTimeout(() => {
            if (confirm("このピンを削除しますか？")) {
                const labelId = document.getElementById(marker.id);
                marker.remove();
                if (labelId) labelId.remove();
                saveMarkers();
                saveLabels();
            }
        }, 600); // 600ミリ秒以上で長押しと判定
    });
    marker.addEventListener("touchend", () => {
        e.stopPropagation();
        clearTimeout(longPressTimer); // 長押しじゃなかったらキャンセル
    });
    map.appendChild(marker);
    if (!isPixel)
    {
        currentMarker = marker;
    }


    // 軌跡オンなら記録
    if (isTrackingPath) {
        const dot = document.createElement('div');
        dot.className = 'marker track';
        dot.style.background = 'rgba(0, 0, 255, 0.4)';
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        dot.style.width = '8px';
        dot.style.height = '8px';
        map.appendChild(dot);
        trackPoints.push(dot);
    }
    localStorage.setItem("lastLat", lat);
    localStorage.setItem("lastLng", lng);

}

//
function togglePanel() {
    const panel = document.getElementById("controlPanel");
    const button = document.getElementById("togglePanel");
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
    button.textContent = isHidden ? "🔽 閉じる" : "▶ 開く";
}

// 現在地追跡
function startTracking() {
    if (!navigator.geolocation) {
        document.getElementById('status').innerText = "⚠️ この端末では位置情報が利用できません。";
        return;
    }

    document.getElementById('status').innerText = "📡 現在地を追跡中...";

    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            addMarker(lat, lng, 'blue');
            document.getElementById('status').innerText =
                `📍 緯度 ${lat.toFixed(5)}, 経度 ${lng.toFixed(5)}（追跡中）`;
        },
        (err) => {
            document.getElementById('status').innerText = `❌ 取得失敗: ${err.message}`;
        },
        {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
        }
    );
}

let isTrackingPath = false;
let trackPoints = [];

function toggleTrack() {
    isTrackingPath = !isTrackingPath;
    const btn = document.querySelector('button[onclick="toggleTrack()"]');
    btn.textContent = isTrackingPath ? "🧭 軌跡: オン" : "🧭 軌跡: オフ";

    if (!isTrackingPath) {
        // 軌跡を消す
        trackPoints.forEach(p => p.remove());
        trackPoints = [];
    }
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        document.getElementById('status').innerText = "🛑 追跡を停止しました。";

        // ピンを削除
        if (currentMarker) {
            currentMarker.remove();
            currentMarker = null;
        }

        // 保存された緯度経度も削除（任意）
        localStorage.removeItem("lastLat");
        localStorage.removeItem("lastLng");
    }
}

// 設定復元
window.addEventListener("DOMContentLoaded", () => {
    const savedImage = localStorage.getItem("mapImage");
    if (savedImage) {
        map.style.backgroundImage = `url('${savedImage}')`;
    }

    const lat1 = localStorage.getItem("lat1");
    const lng1 = localStorage.getItem("lng1");
    const lat2 = localStorage.getItem("lat2");
    const lng2 = localStorage.getItem("lng2");

    if (lat1 && lng1 && lat2 && lng2) {
        document.getElementById("lat1").value = lat1;
        document.getElementById("lng1").value = lng1;
        document.getElementById("lat2").value = lat2;
        document.getElementById("lng2").value = lng2;

        bbox.topLeft.lat = parseFloat(lat1);
        bbox.topLeft.lng = parseFloat(lng1);
        bbox.bottomRight.lat = parseFloat(lat2);
        bbox.bottomRight.lng = parseFloat(lng2);
    }

    const lastLat = localStorage.getItem("lastLat");
    const lastLng = localStorage.getItem("lastLng");
    if (lastLat && lastLng) {
        addMarker(parseFloat(lastLat), parseFloat(lastLng));
    }
});

function toggleAddPin() {
    isAddPinMode = !isAddPinMode;
    const button = event.target;
    button.textContent = isAddPinMode ? "📍 ピン追加モード: オン" : "📍 ピン追加モード: オフ";
}

// 地図画像クリック時にピンを追加
document.getElementById("map").addEventListener("click", function (e) {
    if (!isAddPinMode || !map) return;
    const rect = map.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marker = document.createElement("div");
    marker.className = "marker";
    marker.id = `${x},${y}`;
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    marker.style.background = "red";

    const label = prompt("ラベル（任意）を入力してください:");
    if (label) {
        addLabel(x, y, label, marker.id);
        saveLabels();
    }
    document.getElementById("map").appendChild(marker);
    saveMarkers();
});

function saveMarkers() {
    const markers = [...document.querySelectorAll('.marker')].map(marker => ({

        x: parseFloat(marker.style.left),
        y: parseFloat(marker.style.top),
        label: marker.style.background || "",
        id: marker.id || ""
    }));
    localStorage.setItem("savedMarkers", JSON.stringify(markers));
}

function loadMarkers() {
    const saved = JSON.parse(localStorage.getItem("savedMarkers") || "[]");
    saved.forEach(({ x, y, label, id }) => {
        if (x >= 0 && y >= 0) {
            addMarker(x, y, true, label, id);
        }
    });
}

function addLabel(lat, lng, label, id) {
    const labelDiv = document.createElement("div");
    labelDiv.className = "marker-label";
    labelDiv.innerText = label;
    labelDiv.style.left = `${lat}px`;
    labelDiv.style.top = `${lng}px`;
    labelDiv.id = id;
    document.getElementById("map").appendChild(labelDiv);
}

function saveLabels() {
    const labels = [...document.querySelectorAll('.marker-label')].map(label1 => ({

        x: parseFloat(label1.style.left),
        y: parseFloat(label1.style.top),
        innerText: label1.innerText || "",
        id: label1.id || ""
    }));
    localStorage.setItem("savedLabels", JSON.stringify(labels));
}

function loadLabels() {
    const saved = JSON.parse(localStorage.getItem("savedLabels") || "[]");
    saved.forEach(({ x, y, innerText, id }) => {
        if (x >= 0 && y >= 0) {
            addLabel(x, y, innerText, id);
        }
    });
}

// 地図画像が完全に読み込まれてからピンを復元
map.onload = function () {
    loadMarkers();
    loadLabels();
};

window.addEventListener("DOMContentLoaded", () => {
    const map = document.getElementById("mapImage");

    map.onload = function () {
        console.log("画像ロード完了、ピン復元実行");
        loadLabels();
        loadMarkers();
    };

    if (map.complete) {
        map.onload(); // キャッシュ時の対応
    }
});