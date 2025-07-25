﻿const map = document.getElementById('map');
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
    marker.id = id;
    marker.style.background = color;
    if (!isPixel) {
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
    }
    else {
        marker.style.left = `${lat}px`;
        marker.style.top = `${lng}px`;
    }

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
    if (!isPixel) {
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
            addMarker(lat, lng, false, 'blue', 'target');
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

function toggleResetPin() {
    if (confirm("すべてのピンを削除しますか？")) {
        localStorage.removeItem("savedMarkers");
        localStorage.removeItem("savedLabels");
        // reloadメソッドによりページをリロード
        window.location.reload();
    }
}

document.getElementById("deleteAllBtn").addEventListener("click", () => {
    if (confirm("本当にすべてのピンを削除しますか？")) {
        document.querySelectorAll(".marker").forEach(m => m.remove());
        localStorage.removeItem("savedMarkers");
        document.querySelectorAll(".marker-label").forEach(m => m.remove());
        localStorage.removeItem("savedLabels");
    }
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

//MAP系
const container = document.getElementById("map-container");
const zoomSlider = document.getElementById("zoom-slider");

zoomSlider.addEventListener("input", () => {
    const scale = parseFloat(zoomSlider.value);
    container.style.transform = `scale(${scale})`;
});

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let scrollStartX = 0;
let scrollStartY = 0;

const mapWrapper = document.getElementById("map-wrapper");

mapWrapper.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    scrollStartX = mapWrapper.scrollLeft;
    scrollStartY = mapWrapper.scrollTop;
    mapWrapper.style.cursor = "grabbing";
});

mapWrapper.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    mapWrapper.scrollLeft = scrollStartX - dx;
    mapWrapper.scrollTop = scrollStartY - dy;
});

mapWrapper.addEventListener("mouseup", () => {
    isDragging = false;
    mapWrapper.style.cursor = "default";
});

mapWrapper.addEventListener("mouseleave", () => {
    isDragging = false;
    mapWrapper.style.cursor = "default";
});

function updateCurrentLocationMarker(lat, lng) {
    const pos = latLngToImageXY(lat, lng);

    const marker = document.getElementById("current-location-marker");
    if (!marker) {
        const newMarker = document.createElement("div");
        newMarker.id = "current-location-marker";
        newMarker.style.position = "absolute";
        newMarker.style.width = "10px";
        newMarker.style.height = "10px";
        newMarker.style.borderRadius = "50%";
        newMarker.style.backgroundColor = "blue";
        newMarker.style.zIndex = "10";
        document.getElementById("map").appendChild(newMarker);
    }

    const markerElem = document.getElementById("current-location-marker");
    markerElem.style.left = `${pos.x}px`;
    markerElem.style.top = `${pos.y}px`;
}
document.getElementById("zoom-slider").addEventListener("input", function () {
    currentZoom = parseFloat(this.value);
    // 現在地の緯度経度を保持していれば再描画
    if (lastKnownLat && lastKnownLng) {
        updateCurrentLocationMarker(lastKnownLat, lastKnownLng);
    }
});

function latLngToImageXY(lat, lng) {
    const mapImage = document.getElementById("map-Image");
    const rect = mapImage.getBoundingClientRect(); // 表示上のサイズ
    const naturalWidth = mapImage.naturalWidth;
    const naturalHeight = mapImage.naturalHeight;

    const zoom = currentZoom; // 1.0, 1.5など
    const displayedWidth = naturalWidth * zoom;
    const displayedHeight = naturalHeight * zoom;

    const lat1 = parseFloat(document.getElementById("lat1").value); // 左上
    const lng1 = parseFloat(document.getElementById("lng1").value);
    const lat2 = parseFloat(document.getElementById("lat2").value); // 右下
    const lng2 = parseFloat(document.getElementById("lng2").value);

    // 緯度はY方向に対応。北が上。小さいほど下へ。
    const x = ((lng - lng1) / (lng2 - lng1)) * displayedWidth;
    const y = ((lat1 - lat) / (lat1 - lat2)) * displayedHeight;

    return { x, y };
}