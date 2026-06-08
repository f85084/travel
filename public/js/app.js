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
      import { createTripsModule } from "./modules/trips.js";
      import { createScheduleModule } from "./modules/schedule.js";
      import { createExtraModule } from "./modules/extra.js";

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

          // Google Places 相關
          const autocompleteResults = ref([]);
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
          const {
            filteredTripsList,
            hasLegacyData,
            getTripImageUrl,
            selectTrip,
            selectLegacyTrip,
            openTripModal,
            openEditTripModal,
            closeTripModal,
            openImageModal,
            handleImageUpload,
            submitTrip: submitTripRecord,
            confirmDeleteTrip,
            setTrips,
          } = createTripsModule({
            refs: {
              allTrips,
              allSchedules,
              currentTrip,
              currentDay,
              currentTag,
              tripFilter,
              isTripModalOpen,
              isEditingTrip,
              tripForm,
              showTripImage,
              showExtraView,
              submitting,
              isUserControlled,
              imageModalUrl,
              loading,
            },
            deps: {
              computed,
              db,
              storage,
              setDoc,
              updateDoc,
              doc,
              writeBatch,
              storageRef,
              deleteObject,
              showAlert,
              showConfirm,
              isTripExpired,
            },
          });
          const {
            filteredData,
            tripDays,
            setSchedules,
          } = createScheduleModule({
            refs: {
              allSchedules,
              currentTrip,
              currentDay,
              currentTag,
              sortableList,
            },
            deps: {
              computed,
              watch,
              nextTick,
              db,
              writeBatch,
              doc,
            },
          });
          const {
            filteredExtraData,
            filteredLocationData,
            openAddExtraModal,
            openEditExtraModal,
            findDuplicateAddressInExtra,
            moveToExtra,
            moveToDay,
            setExtraSchedules,
          } = createExtraModule({
            refs: {
              allExtraSchedules,
              allSchedules,
              currentTrip,
              currentDay,
              currentTag,
              showExtraView,
              showGlobalExtra,
              extraSearchQuery,
              extraSearchTag,
              isEditing,
              isModalOpen,
              form,
              user,
              submitting,
            },
            deps: {
              computed,
              db,
              doc,
              setDoc,
              updateDoc,
              deleteDoc,
              showAlert,
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
                setTrips(
                  snapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
                );
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
                setSchedules(
                  snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  })),
                );
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
                setExtraSchedules(snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                })));
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


          // ============ AUTO-COLLAPSE TRIP IMAGE ============
          watch(showTripImage, (newVal) => {
            // 如果用户手动操作（isUserControlled = true），禁用自动收合
            if (isUserControlled.value) {
              // trip image auto-collapse is now handled inside trips module
            }
          });

          // ============ ACTIONS ============
          const submitTrip = async () => {
            await submitTripRecord(user);
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
          const closeModal = () => (isModalOpen.value = false);

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
