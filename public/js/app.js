      import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
      import {
        getAuth,
        signInAnonymously,
        onAuthStateChanged,
      } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
      import {
        getFirestore,
        collection,
        setDoc,
        updateDoc,
        deleteDoc,
        doc,
        onSnapshot,
        query,
        writeBatch,
      } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
      import {
        getStorage,
        ref as storageRef,
        uploadBytes,
        getDownloadURL,
        deleteObject,
      } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
      import { showAlert, showConfirm } from "./shared/ui.js";
      import {
        isTripExpired,
        formatDate,
        calculateDuration,
      } from "./shared/formatters.js";
      import {
        getCategoryColor,
        getCategoryIcon,
        getCategoryBadgeStyle,
        hasParkingInfo,
      } from "./shared/category-map.js";
      import { createGooglePlacesIntegration } from "./integrations/google-places.js";

      const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

      createApp({
        setup() {
          // ============ CONFIG INIT ============
          const configError = ref(false);
          const permissionError = ref(false);
          let app, auth, db, storage;
          let appId = "my-trip-app";

          // 嘗試載入設定
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
          } catch (e) {}

          // 檢查設定是否存在
          if (!firebaseConfig.apiKey) {
            console.error("Critical Error: Firebase config is missing.");
            configError.value = true;
          } else {
            try {
              app = initializeApp(firebaseConfig);
              auth = getAuth(app);
              db = getFirestore(app);
              storage = getStorage(app);
            } catch (e) {
              console.error("Firebase init failed:", e);
              configError.value = true;
            }
          }

          // ============ STATE ============
          const user = ref(null);
          const loading = ref(false);
          const submitting = ref(false);

          // Data Collections
          const allTrips = ref([]);
          const allSchedules = ref([]);
          const allExtraSchedules = ref([]);

          // Navigation & Filter State
          const currentTrip = ref(null);
          const currentDay = ref("all");
          const currentTag = ref("全部");
          const tripFilter = ref("upcoming");
          const showScheduleImages = ref({});

          // Modal States
          const isTripModalOpen = ref(false);
          const isEditingTrip = ref(false);
          const isModalOpen = ref(false);
          const isEditing = ref(false);
          const expandedItems = ref([]);
          const expandedNotes = ref([]);
          const expandedBusinessHours = ref([]);
          const imageModalUrl = ref(null);
          const showTripImage = ref(true);
          const showExtraView = ref(false);
          const showGlobalExtra = ref(false);
          const extraSearchQuery = ref("");
          const extraSearchTag = ref("");

          // Sortable
          const sortableList = ref(null);
          let sortableInstance = null;

          // Google Places 相關
          const autocompleteResults = ref([]);
          let tripImageTimer = null;
          const selectedPlaceId = ref("");
          const businessInfoStatus = ref("");
          const isUserControlled = ref(false);

          // Forms
          const tripForm = ref({
            id: null,
            name: "",
            startDate: "",
            endDate: "",
            imageUrl: "",
            imageFile: null,
            url: "",
          });
          const form = ref({
            id: null,
            isExtra: false,
            day: "1",
            activity: "",
            tag: "景點",
            bookingTime: "",
            address: "",
            note: "",
            url: "",
            businessHours: "",
          });
          const {
            initGooglePlaces,
            onAddressSelected,
            onAddressInput,
            selectAutocomplete,
          } = createGooglePlacesIntegration({
            form,
            refs: {
              autocompleteResults,
              selectedPlaceId,
              businessInfoStatus,
            },
          });

          // Static Data
          const filterTags = [
            { name: "全部", icon: "fa-list" },
            { name: "景點", icon: "fa-camera" },
            { name: "食", icon: "fa-utensils" },
            { name: "購物", icon: "fa-shopping-bag" },
            { name: "交通", icon: "fa-train-subway" },
            { name: "住宿", icon: "fa-bed" },
            { name: "活動", icon: "fa-person-hiking" },
          ];

          // ============ AUTH & LISTENERS ============
          onMounted(() => {
            if (configError.value) return;

            // 初始化 Google Places
            initGooglePlaces();

            loading.value = true;
            const initAuth = async () => {
              try {
                await signInAnonymously(auth);
              } catch (error) {
                console.error("Auth Error:", error);
                // 讓使用者知道網路連線或設定可能有問題，但不讓 Vue 崩潰
                showAlert(
                  "連線失敗：請檢查網路或 config.js 設定是否正確，並確認已開啟 Firebase 匿名登入功能。",
                  "error",
                );
                loading.value = false;
              }
            };

            initAuth();
            onAuthStateChanged(auth, (currentUser) => {
              user.value = currentUser;
              if (currentUser) setupListeners();
            });
          });

          const setupListeners = () => {
            let tripsLoaded = false;
            let schedulesLoaded = false;
            let extraSchedulesLoaded = false;

            const checkLoadingComplete = () => {
              if (tripsLoaded && schedulesLoaded && extraSchedulesLoaded) {
                loading.value = false;
              }
            };

            // Fetch Trips
            const qTrips = query(collection(db, "travel"));
            onSnapshot(
              qTrips,
              (snapshot) => {
                allTrips.value = snapshot.docs
                  .map((doc) => ({ id: doc.id, ...doc.data() }))
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                tripsLoaded = true;
                checkLoadingComplete();
              },
              (error) => {
                console.error("Firestore Error (Trips):", error);
                if (error.code === "permission-denied") {
                  permissionError.value = true;
                  showAlert(
                    "無權限存取資料，請檢查 Firestore 規則設定",
                    "error",
                  );
                }
                loading.value = false;
              },
            );

            // Fetch All Schedules
            const qSchedules = query(collection(db, "travel_schedule"));
            onSnapshot(
              qSchedules,
              (snapshot) => {
                allSchedules.value = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                schedulesLoaded = true;
                checkLoadingComplete();
              },
              (error) => {
                console.error("Firestore Error (Schedules):", error);
                if (error.code === "permission-denied") {
                  permissionError.value = true;
                  showAlert(
                    "無權限存取資料，請檢查 Firestore 規則設定",
                    "error",
                  );
                }
                loading.value = false;
              },
            );

            // Fetch All Extra Schedules
            const qExtraSchedules = query(collection(db, "travel_extra"));
            onSnapshot(
              qExtraSchedules,
              (snapshot) => {
                allExtraSchedules.value = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                extraSchedulesLoaded = true;
                checkLoadingComplete();
              },
              (error) => {
                console.error("Firestore Error (Extra Schedules):", error);
                if (error.code === "permission-denied") {
                  permissionError.value = true;
                  showAlert(
                    "無權限存取資料，請檢查 Firestore 規則設定",
                    "error",
                  );
                }
                loading.value = false;
              },
            );
          };

          // ============ HELPERS & COMPUTED ============
          const retryLoad = () => window.location.reload();

          // 相容舊資料：優先使用 imageUrl，如果沒有則使用 imageBase64
          const getTripImageUrl = (trip) =>
            trip.imageUrl || trip.imageBase64 || null;

          const filteredTripsList = computed(() => {
            if (tripFilter.value === "all") {
              return allTrips.value;
            } else {
              return allTrips.value.filter((trip) => !isTripExpired(trip));
            }
          });

          const hasLegacyData = computed(() =>
            allSchedules.value.some((item) => !item.tripId),
          );

          const filteredData = computed(() => {
            if (!currentTrip.value) return [];
            const targetTripId = currentTrip.value.id;
            const isLegacy = targetTripId === "legacy";
            const currentDayStr = String(currentDay.value);
            const showAll = currentTag.value === "全部";
            const showAllDays = currentDayStr === "all";

            const data = allSchedules.value.filter((item) => {
              // 檢查 day 匹配：如果選擇 "all" 則顯示所有天
              if (!showAllDays && String(item.day) !== currentDayStr)
                return false;

              // 檢查 trip 匹配
              const isTripMatch = isLegacy
                ? !item.tripId
                : item.tripId === targetTripId;
              if (!isTripMatch) return false;

              // 檢查標籤匹配
              return showAll || item.tag === currentTag.value;
            });

            // 使用穩定排序
            return data.sort((a, b) => {
              const orderA = a.order ?? Infinity;
              const orderB = b.order ?? Infinity;
              if (orderA !== orderB) return orderA - orderB;
              return (a.bookingTime || "99:99").localeCompare(
                b.bookingTime || "99:99",
              );
            });
          });

          const filteredExtraData = computed(() => {
            if (!currentTrip.value && !showGlobalExtra.value) return [];

            const showAll = currentTag.value === "全部";
            let data = [];

            if (showGlobalExtra.value) {
              // 顯示所有旅程的額外行程
              data = allExtraSchedules.value.filter((item) => {
                // 檢查標籤匹配
                return showAll || item.tag === currentTag.value;
              });
            } else {
              // 只顯示目前旅程的額外行程
              const targetTripId = currentTrip.value.id;
              const isLegacy = targetTripId === "legacy";

              data = allExtraSchedules.value.filter((item) => {
                // 檢查 trip 匹配
                const isTripMatch = isLegacy
                  ? !item.tripId
                  : item.tripId === targetTripId;
                if (!isTripMatch) return false;

                // 在單個行程視圖中，過濾掉已加到日程的項目
                if (item.usedInSchedule) return false;

                // 檢查標籤匹配
                return showAll || item.tag === currentTag.value;
              });
            }

            // 應用搜尋篩選
            if (extraSearchQuery.value.trim()) {
              const query = extraSearchQuery.value.toLowerCase();
              data = data.filter((item) => {
                return (
                  item.activity.toLowerCase().includes(query) ||
                  (item.address || "").toLowerCase().includes(query) ||
                  (item.note || "").toLowerCase().includes(query)
                );
              });
            }

            // 應用標籤篩選
            if (extraSearchTag.value) {
              data = data.filter((item) => item.tag === extraSearchTag.value);
            }

            // 使用穩定排序
            return data.sort((a, b) => {
              const orderA = a.order ?? Infinity;
              const orderB = b.order ?? Infinity;
              if (orderA !== orderB) return orderA - orderB;
              return (a.bookingTime || "99:99").localeCompare(
                b.bookingTime || "99:99",
              );
            });
          });

          const filteredLocationData = computed(() => {
            // 顯示所有旅程的額外行程（全域視圖）
            let data = allExtraSchedules.value;

            // 應用搜尋篩選
            if (extraSearchQuery.value.trim()) {
              const query = extraSearchQuery.value.toLowerCase();
              data = data.filter((item) => {
                return (
                  item.activity.toLowerCase().includes(query) ||
                  (item.address || "").toLowerCase().includes(query) ||
                  (item.note || "").toLowerCase().includes(query)
                );
              });
            }

            // 應用標籤篩選
            if (extraSearchTag.value) {
              data = data.filter((item) => item.tag === extraSearchTag.value);
            }

            // 使用穩定排序
            return data.sort((a, b) => {
              const orderA = a.order ?? Infinity;
              const orderB = b.order ?? Infinity;
              if (orderA !== orderB) return orderA - orderB;
              return (a.bookingTime || "99:99").localeCompare(
                b.bookingTime || "99:99",
              );
            });
          });

          const tripDays = computed(() => {
            if (
              !currentTrip.value ||
              !currentTrip.value.startDate ||
              !currentTrip.value.endDate
            ) {
              return [];
            }
            const start = new Date(currentTrip.value.startDate);
            const end = new Date(currentTrip.value.endDate);

            // 驗證日期有效性
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
              return [];
            }

            const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
            const days = [];
            const current = new Date(start);
            let dayNum = 1;
            const maxDays = 365; // 防止無限循環

            while (current <= end && dayNum <= maxDays) {
              const dayOfWeek = weekDays[current.getDay()];
              days.push({
                num: dayNum,
                dateDisplay: `${current.getMonth() + 1}/${current.getDate()} (${dayOfWeek})`,
              });
              current.setDate(current.getDate() + 1);
              dayNum++;
            }
            return days;
          });

          // ============ SORTING LOGIC ============
          watch([filteredData, currentDay, currentTag], async () => {
            await nextTick();
            if (sortableList.value) {
              if (sortableInstance) sortableInstance.destroy();
              sortableInstance = new Sortable(sortableList.value, {
                handle: ".handle",
                animation: 150,
                ghostClass: "sortable-ghost",
                dragClass: "sortable-drag",
                onEnd: async (evt) => {
                  if (evt.newIndex === evt.oldIndex) return;
                  const newOrderIds = Array.from(
                    sortableList.value.children,
                  ).map((el) => el.getAttribute("data-id"));
                  const batch = writeBatch(db);
                  newOrderIds.forEach((id, index) => {
                    if (!id) return;
                    const ref = doc(db, "travel_schedule", id);
                    batch.update(ref, { order: index });
                  });
                  try {
                    await batch.commit();
                  } catch (e) {
                    console.error("Sort error", e);
                  }
                },
              });
            }
          });

          // ============ AUTO-COLLAPSE TRIP IMAGE ============
          watch(showTripImage, (newVal) => {
            // 如果用户手动操作（isUserControlled = true），禁用自动收合
            if (isUserControlled.value) {
              if (tripImageTimer) {
                clearTimeout(tripImageTimer);
                tripImageTimer = null;
              }
            }
          });

          // ============ ACTIONS ============
          const selectTrip = (trip) => {
            currentTrip.value = trip;
            currentDay.value = "all";
            currentTag.value = "全部";
            showExtraView.value = false;

            // 重置图片状态并启用自动收合
            showTripImage.value = true;
            isUserControlled.value = false;

            // 清除之前的定时器
            if (tripImageTimer) {
              clearTimeout(tripImageTimer);
            }

            // 3秒后自动收合
            tripImageTimer = setTimeout(() => {
              showTripImage.value = false;
            }, 3000);
          };
          const selectLegacyTrip = () => {
            currentTrip.value = {
              id: "legacy",
              name: "未分類行程",
              startDate: "2024-01-01",
              endDate: "2024-01-03",
            };
            currentDay.value = "all";
            currentTag.value = "全部";
            showExtraView.value = false;
          };

          const openTripModal = () => {
            isEditingTrip.value = false;
            tripForm.value = {
              id: null,
              name: "",
              startDate: "",
              endDate: "",
              imageUrl: "",
              imageBase64: "",
              imageFile: null,
              url: "",
            };
            isTripModalOpen.value = true;
          };
          const openEditTripModal = (trip) => {
            isEditingTrip.value = true;
            // 相容舊資料：保留 imageBase64 如果存在
            tripForm.value = {
              ...trip,
              imageUrl: trip.imageUrl || "",
              imageBase64: trip.imageBase64 || "",
              imageFile: null,
            };
            isTripModalOpen.value = true;
          };
          const closeTripModal = () => (isTripModalOpen.value = false);

          const openImageModal = (url) => {
            imageModalUrl.value = url;
          };

          const handleImageUpload = (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith("image/")) {
              showAlert("請選擇圖片檔案", "error");
              return;
            }

            // Check file size (limit to 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
              showAlert("圖片大小不能超過 5MB", "error");
              event.target.value = ""; // Clear input
              return;
            }

            tripForm.value.imageFile = file;

            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
              tripForm.value.imageUrl = e.target?.result || "";
            };
            reader.onerror = () => {
              showAlert("圖片讀取失敗", "error");
              event.target.value = "";
            };
            reader.readAsDataURL(file);
          };

          const submitTrip = async () => {
            if (!user.value) return;

            // 驗證日期
            const start = new Date(tripForm.value.startDate);
            const end = new Date(tripForm.value.endDate);
            if (start > end) {
              showAlert("結束日期必須在開始日期之後", "error");
              return;
            }

            submitting.value = true;
            try {
              let imageBase64 = tripForm.value.imageBase64 || "";
              let imageUrl = tripForm.value.imageUrl || "";

              // 如果選擇了新檔案，將其轉換為 Base64 存儲
              if (tripForm.value.imageFile instanceof File) {
                try {
                  imageBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error("圖片讀取失敗"));
                    reader.readAsDataURL(tripForm.value.imageFile);
                  });
                  imageUrl = ""; // 清除 imageUrl，使用 imageBase64
                } catch (error) {
                  console.error("Image conversion error:", error);
                  showAlert(error.message || "圖片轉換失敗", "error");
                  submitting.value = false;
                  return;
                }
              }

              const tripData = {
                name: tripForm.value.name.trim(),
                startDate: tripForm.value.startDate,
                endDate: tripForm.value.endDate,
                imageUrl,
                imageBase64,
                url: tripForm.value.url.trim(),
                updatedAt: Date.now(),
              };

              if (isEditingTrip.value && tripForm.value.id) {
                await updateDoc(doc(db, "travel", tripForm.value.id), tripData);
              } else {
                const newId = String(Date.now()); // 使用時間戳作為 ID 更安全
                await setDoc(doc(db, "travel", newId), {
                  ...tripData,
                  id: newId,
                  createdAt: Date.now(),
                });
              }
              closeTripModal();
              showAlert("保存成功！", "success");
            } catch (e) {
              console.error("Save error:", e);
              showAlert(`儲存失敗：${e.message || "未知錯誤"}`, "error");
            } finally {
              submitting.value = false;
            }
          };

          const confirmDeleteTrip = async (trip) => {
            const result = await showConfirm(
              `確定要刪除「${trip.name}」嗎？裡面的行程也會一併刪除喔！`,
            );
            if (!result) return;
            try {
              const batch = writeBatch(db);

              // 刪除旅程本身
              batch.delete(doc(db, "travel", trip.id));

              // 刪除所有關聯的行程 (tripId 匹配此旅程)
              const relatedSchedules = allSchedules.value.filter(
                (schedule) => schedule.tripId === trip.id,
              );
              relatedSchedules.forEach((schedule) => {
                batch.delete(doc(db, "travel_schedule", schedule.id));
              });

              // 一次性提交所有刪除操作
              await batch.commit();

              // Delete image from Storage if exists
              if (trip.imageUrl) {
                try {
                  const imageRef = storageRef(
                    storage,
                    `trip-images/${trip.id}`,
                  );
                  await deleteObject(imageRef).catch(() => {});
                } catch (e) {}
              }
            } catch (e) {
              showAlert("刪除失敗", "error");
            }
          };

          const openAddModal = () => {
            isEditing.value = false;
            form.value = {
              id: null,
              isExtra: false,
              day: currentDay.value === "all" ? "1" : currentDay.value,
              activity: "",
              tag: "景點",
              bookingTime: "",
              address: "",
              note: "",
              url: "",
              businessHours: "",
            };
            isModalOpen.value = true;
          };
          const openEditModal = (item) => {
            isEditing.value = true;
            form.value = {
              id: item.id,
              isExtra: false,
              day: item.day || "1",
              activity: item.activity || "",
              tag: item.tag || "景點",
              bookingTime: item.bookingTime || "",
              address: item.address || "",
              note: item.note || "",
              url: item.url || "",
              businessHours: item.businessHours || "",
            };
            isModalOpen.value = true;
          };
          const openAddExtraModal = () => {
            isEditing.value = false;
            form.value = {
              id: null,
              isExtra: true,
              day:
                currentDay.value === "all" || !currentDay.value
                  ? "1"
                  : currentDay.value,
              activity: "",
              tag: "景點",
              bookingTime: "",
              address: "",
              note: "",
              url: "",
              businessHours: "",
            };
            isModalOpen.value = true;
          };
          const openEditExtraModal = (item) => {
            isEditing.value = true;
            form.value = {
              id: item.id,
              isExtra: true,
              day: item.day || "1",
              activity: item.activity || "",
              tag: item.tag || "景點",
              bookingTime: item.bookingTime || "",
              address: item.address || "",
              note: item.note || "",
              url: item.url || "",
              businessHours: item.businessHours || "",
            };
            isModalOpen.value = true;
          };
          const closeModal = () => (isModalOpen.value = false);

          // 查找相同地址的額外行程項目
          const findDuplicateAddressInExtra = (address) => {
            if (!address || !address.trim()) return null;
            const trimmedAddress = address.trim().toLowerCase();

            if (showGlobalExtra.value) {
              // 全域查找
              return allExtraSchedules.value.find(
                (item) =>
                  item.address &&
                  item.address.trim().toLowerCase() === trimmedAddress,
              );
            } else if (currentTrip.value) {
              // 只在目前旅程查找
              const targetTripId = currentTrip.value.id;
              const isLegacy = targetTripId === "legacy";
              return allExtraSchedules.value.find((item) => {
                const isTripMatch = isLegacy
                  ? !item.tripId
                  : item.tripId === targetTripId;
                return (
                  isTripMatch &&
                  item.address &&
                  item.address.trim().toLowerCase() === trimmedAddress
                );
              });
            }
            return null;
          };

          const submitForm = async () => {
            if (!user.value) return;

            // 驗證必填欄位
            if (!form.value.activity.trim()) {
              showAlert("請填寫活動名稱", "error");
              return;
            }

            // 如果是新增且提供了地址，檢查是否有重複的項目
            if (
              !isEditing.value &&
              form.value.address.trim() &&
              !form.value.isExtra
            ) {
              const duplicateExtra = findDuplicateAddressInExtra(
                form.value.address,
              );
              if (duplicateExtra) {
                const { ElMessageBox } = window.ElementPlus;
                try {
                  await ElMessageBox.confirm(
                    `發現相同地點的額外行程：${duplicateExtra.activity}\\n\\n是否直接使用此項而不新增重複?`,
                    "偵測到重複地點",
                    {
                      confirmButtonText: "使用現有項目",
                      cancelButtonText: "建立新的",
                      type: "info",
                    },
                  );
                  // 用戶選擇使用現有項目
                  submitting.value = true;
                  try {
                    // 建立到目前天數的項目，參考該額外行程
                    const newScheduleItem = {
                      activity: duplicateExtra.activity,
                      tag: duplicateExtra.tag,
                      bookingTime: duplicateExtra.bookingTime || "",
                      address: duplicateExtra.address || "",
                      note: duplicateExtra.note || "",
                      url: duplicateExtra.url || "",
                      businessHours: duplicateExtra.businessHours || "",
                      tripId:
                        currentTrip.value.id === "legacy"
                          ? null
                          : currentTrip.value.id,
                      day: String(form.value.day),
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };

                    // 計算排序
                    const currentDayItems = allSchedules.value.filter(
                      (schedule) =>
                        schedule.tripId === newScheduleItem.tripId &&
                        String(schedule.day) === String(form.value.day),
                    );
                    newScheduleItem.order =
                      currentDayItems.length > 0
                        ? Math.max(
                            ...currentDayItems.map((i) => i.order ?? 0),
                          ) + 1
                        : 0;

                    const newId = String(Date.now());
                    await setDoc(doc(db, "travel_schedule", newId), {
                      ...newScheduleItem,
                      id: newId,
                    });

                    closeModal();
                    showAlert(`已加到 Day ${form.value.day}`, "success");
                    currentDay.value = String(form.value.day);
                  } catch (e) {
                    console.error("Add error:", e);
                    showAlert(`新增失敗：${e.message || "未知錯誤"}`, "error");
                  } finally {
                    submitting.value = false;
                  }
                  return;
                } catch (e) {
                  // 用戶選擇建立新的
                }
              }
            }

            // 如果有地址但尚未抓到營業資訊，先補齊
            if (form.value.address.trim() && !form.value.businessHours.trim()) {
              await onAddressSelected();
            }

            submitting.value = true;

            try {
              const isExtra = form.value.isExtra || false;
              const collectionName = isExtra
                ? "travel_extra"
                : "travel_schedule";
              const payload = {
                activity: form.value.activity.trim(),
                tag: form.value.tag,
                bookingTime: form.value.bookingTime.trim(),
                address: form.value.address.trim(),
                note: form.value.note.trim(),
                url: form.value.url.trim(),
                businessHours: form.value.businessHours.trim(),
                tripId:
                  currentTrip.value && currentTrip.value.id === "legacy"
                    ? null
                    : currentTrip.value?.id || null,
                updatedAt: Date.now(),
              };

              // 只有 travel_schedule 需要 day 欄位
              if (!isExtra) {
                payload.day = String(form.value.day);
              }

              // 計算新的排序順序
              if (!isEditing.value) {
                const currentItems = isExtra
                  ? filteredExtraData.value
                  : filteredData.value;
                payload.order =
                  currentItems.length > 0
                    ? Math.max(...currentItems.map((i) => i.order ?? 0)) + 1
                    : 0;
              }

              if (isEditing.value && form.value.id) {
                await updateDoc(
                  doc(db, collectionName, form.value.id),
                  payload,
                );
              } else {
                const newId = String(Date.now()); // 使用時間戳作為 ID
                await setDoc(doc(db, collectionName, newId), {
                  ...payload,
                  id: newId,
                  createdAt: Date.now(),
                });
              }
              closeModal();
              const hasBusinessInfo = form.value.businessHours.trim();
              const statusLabel =
                businessInfoStatus.value === "ok"
                  ? "已取得營業資訊"
                  : businessInfoStatus.value === "no-hours"
                    ? "Google 未提供營業資訊"
                    : businessInfoStatus.value === "no-place"
                      ? "找不到對應地點"
                      : businessInfoStatus.value === "error"
                        ? "查詢失敗"
                        : "未取得營業資訊";
              showAlert(
                hasBusinessInfo
                  ? `保存成功（${statusLabel}）`
                  : `保存成功（${statusLabel}）`,
                "success",
              );
            } catch (e) {
              console.error("Save error:", e);
              showAlert(`儲存失敗：${e.message || "未知錯誤"}`, "error");
            } finally {
              submitting.value = false;
            }
          };

          const deleteItem = async () => {
            const result = await showConfirm("確定要刪除這個行程嗎？");
            if (!result) return;
            if (!user.value || !form.value.id) return;
            submitting.value = true;
            try {
              const isExtra = form.value.isExtra || false;
              const collectionName = isExtra
                ? "travel_extra"
                : "travel_schedule";
              await deleteDoc(doc(db, collectionName, form.value.id));
              closeModal();
            } catch (e) {
              showAlert("刪除失敗", "error");
            } finally {
              submitting.value = false;
            }
          };

          const toggleExpand = (id) => {
            if (expandedItems.value.includes(id))
              expandedItems.value = expandedItems.value.filter((i) => i !== id);
            else expandedItems.value.push(id);
          };
          const toggleNoteExpand = (id) => {
            if (expandedNotes.value.includes(id))
              expandedNotes.value = expandedNotes.value.filter((i) => i !== id);
            else expandedNotes.value.push(id);
          };
          const toggleBusinessHoursExpand = (id) => {
            if (expandedBusinessHours.value.includes(id))
              expandedBusinessHours.value = expandedBusinessHours.value.filter(
                (i) => i !== id,
              );
            else expandedBusinessHours.value.push(id);
          };

          // 移動一般行程到額外行程
          const moveToExtra = async (item) => {
            if (!user.value || !item.id) return;

            try {
              submitting.value = true;

              // 計算新的排序順序
              const currentExtraItems = filteredExtraData.value;
              const newOrder =
                currentExtraItems.length > 0
                  ? Math.max(...currentExtraItems.map((i) => i.order ?? 0)) + 1
                  : 0;

              // 在額外行程集合中創建新項目
              const newExtraItem = {
                activity: item.activity,
                tag: item.tag,
                bookingTime: item.bookingTime || "",
                address: item.address || "",
                note: item.note || "",
                url: item.url || "",
                businessHours: item.businessHours || "",
                tripId: item.tripId,
                order: newOrder,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };

              const newId = String(Date.now());
              await setDoc(doc(db, "travel_extra", newId), {
                ...newExtraItem,
                id: newId,
              });

              // 刪除原來的一般行程項目
              await deleteDoc(doc(db, "travel_schedule", item.id));

              showAlert("已移至額外行程", "success");
            } catch (e) {
              console.error("Move to extra error:", e);
              showAlert(`移動失敗：${e.message || "未知錯誤"}`, "error");
            } finally {
              submitting.value = false;
            }
          };

          // 移動額外行程到一般行程的特定天數
          const moveToDay = async (item, event) => {
            const dayNum = event.target.value;
            if (!user.value || !item.id || !dayNum) return;

            try {
              submitting.value = true;

              // 計算新的排序順序
              const currentDayItems = allSchedules.value.filter(
                (schedule) =>
                  schedule.tripId === item.tripId &&
                  String(schedule.day) === String(dayNum),
              );
              const newOrder =
                currentDayItems.length > 0
                  ? Math.max(...currentDayItems.map((i) => i.order ?? 0)) + 1
                  : 0;

              // 在一般行程集合中創建新項目
              const newScheduleItem = {
                activity: item.activity,
                tag: item.tag,
                bookingTime: item.bookingTime || "",
                address: item.address || "",
                note: item.note || "",
                url: item.url || "",
                businessHours: item.businessHours || "",
                tripId: item.tripId,
                day: String(dayNum),
                order: newOrder,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };

              const newId = String(Date.now());
              await setDoc(doc(db, "travel_schedule", newId), {
                ...newScheduleItem,
                id: newId,
              });

              // 標記額外行程已被加入日程（但不刪除，以便在首頁全部地點仍可看到）
              await updateDoc(doc(db, "travel_extra", item.id), {
                usedInSchedule: true,
                updatedAt: Date.now(),
              });

              // 重置下拉選單
              event.target.value = "";

              showAlert(`已加到 Day ${dayNum}`, "success");

              // 切換到該天的視圖
              currentDay.value = String(dayNum);
              showExtraView.value = false;
            } catch (e) {
              console.error("Move to day error:", e);
              showAlert(`移動失敗：${e.message || "未知錯誤"}`, "error");
            } finally {
              submitting.value = false;
            }
          };

          return {
            user,
            loading,
            submitting,
            configError,
            permissionError,
            retryLoad,
            allTrips,
            currentTrip,
            hasLegacyData,
            filteredData,
            filteredExtraData,
            filteredLocationData,
            tripDays,
            filterTags,
            currentDay,
            currentTag,
            isTripModalOpen,
            isEditingTrip,
            isModalOpen,
            isEditing,
            expandedItems,
            expandedNotes,
            expandedBusinessHours,
            imageModalUrl,
            showScheduleImages,
            tripForm,
            form,
            sortableList,
            tripFilter,
            filteredTripsList,
            isTripExpired,
            getTripImageUrl,
            showTripImage,
            showExtraView,
            showGlobalExtra,
            extraSearchQuery,
            extraSearchTag,
            selectTrip,
            selectLegacyTrip,
            confirmDeleteTrip,
            openTripModal,
            openEditTripModal,
            closeTripModal,
            openImageModal,
            handleImageUpload,
            submitTrip,
            openAddModal,
            openEditModal,
            openAddExtraModal,
            openEditExtraModal,
            closeModal,
            submitForm,
            deleteItem,
            toggleExpand,
            toggleNoteExpand,
            toggleBusinessHoursExpand,
            formatDate,
            calculateDuration,
            getCategoryColor,
            getCategoryIcon,
            getCategoryBadgeStyle,
            hasParkingInfo,
            moveToExtra,
            moveToDay,
            findDuplicateAddressInExtra,
            onAddressSelected,
            onAddressInput,
            autocompleteResults,
            selectAutocomplete,
          };
        },
      }).mount("#app");
