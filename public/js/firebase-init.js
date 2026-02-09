// ==================== Firebase 初始化 ====================

/**
 * 初始化 Firebase 並返回相關實例
 * @returns {Object} { app, auth, db, storage, appId, configError }
 */
export function initializeFirebase() {
  let app, auth, db, storage;
  let appId = "my-trip-app";
  let configError = false;

  // 嘗試從 config.js 載入設定
  let firebaseConfig = window.firebaseConfig || {};

  // 預覽環境相容
  try {
    if (typeof __firebase_config !== "undefined") {
      firebaseConfig = JSON.parse(__firebase_config);
    }
    if (typeof __app_id !== "undefined") {
      // Sanitize appId to ensure odd segments in Firestore path
      appId = __app_id.replace(/[^a-zA-Z0-9_-]/g, "_");
    }
  } catch (e) {
    console.error("Config parse error:", e);
  }

  // 檢查設定是否存在
  if (!firebaseConfig.apiKey) {
    console.error("Critical Error: Firebase config is missing.");
    configError = true;
  } else {
    try {
      const { initializeApp } = window.firebase;
      const { getAuth } = window.firebaseAuth;
      const { getFirestore } = window.firebaseFirestore;
      const { getStorage } = window.firebaseStorage;

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (e) {
      console.error("Firebase init failed:", e);
      configError = true;
    }
  }

  return {
    app,
    auth,
    db,
    storage,
    appId,
    configError,
  };
}

/**
 * 設置匿名登入
 * @param {Object} auth - Firebase Auth 實例
 * @param {Function} onSuccess - 成功回調
 * @param {Function} onError - 失敗回調
 */
export async function setupAuth(auth, onSuccess, onError) {
  try {
    const { signInAnonymously, onAuthStateChanged } = window.firebaseAuth;
    await signInAnonymously(auth);
    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && onSuccess) {
        onSuccess(currentUser);
      }
    });
  } catch (error) {
    console.error("Auth Error:", error);
    if (onError) {
      onError(error);
    }
  }
}

/**
 * 設置 Firestore 監聽器
 * @param {Object} db - Firestore 實例
 * @param {Function} onTripsUpdate - 行程更新回調
 * @param {Function} onSchedulesUpdate - 日程更新回調
 * @param {Function} onExtraSchedulesUpdate - 額外日程更新回調
 * @param {Function} onError - 錯誤回調
 * @returns {Object} { tripsUnsubscribe, schedulesUnsubscribe, extraSchedulesUnsubscribe }
 */
export function setupFirestoreListeners(
  db,
  onTripsUpdate,
  onSchedulesUpdate,
  onExtraSchedulesUpdate,
  onError,
) {
  const { collection, query, onSnapshot } = window.firebaseFirestore;

  // 監聽行程
  const qTrips = query(collection(db, "travel"));
  const tripsUnsubscribe = onSnapshot(
    qTrips,
    (snapshot) => {
      const trips = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (onTripsUpdate) onTripsUpdate(trips);
    },
    (error) => {
      console.error("Firestore Error (Trips):", error);
      if (onError) onError(error);
    },
  );

  // 監聽日程
  const qSchedules = query(collection(db, "travel_schedule"));
  const schedulesUnsubscribe = onSnapshot(
    qSchedules,
    (snapshot) => {
      const schedules = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (onSchedulesUpdate) onSchedulesUpdate(schedules);
    },
    (error) => {
      console.error("Firestore Error (Schedules):", error);
      if (onError) onError(error);
    },
  );

  // 監聽額外日程
  const qExtraSchedules = query(collection(db, "travel_extra"));
  const extraSchedulesUnsubscribe = onSnapshot(
    qExtraSchedules,
    (snapshot) => {
      const extraSchedules = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (onExtraSchedulesUpdate) onExtraSchedulesUpdate(extraSchedules);
    },
    (error) => {
      console.error("Firestore Error (Extra Schedules):", error);
      if (onError) onError(error);
    },
  );

  return {
    tripsUnsubscribe,
    schedulesUnsubscribe,
    extraSchedulesUnsubscribe,
  };
}
