export const createGooglePlacesIntegration = ({ form, refs }) => {
  let autocompleteService = null;
  let placesService = null;
  let geocoder = null;
  let map = null;
  let autocompleteTimer = null;
  const placesCache = {};

  const { autocompleteResults, selectedPlaceId, businessInfoStatus } = refs;

  const formatBusinessHours = (openingHours) => {
    if (!openingHours || !openingHours.weekday_text) return null;
    return openingHours.weekday_text.join("\n");
  };

  const isLikelyAddress = (text) => {
    if (!text) return false;
    const hasNumber = /\d/.test(text);
    const hasAddressWord = /路|街|巷|弄|號|大道|段|鄉|鎮|市|縣|區/.test(text);
    return hasNumber && hasAddressWord;
  };

  const fetchPlaceDetails = async (placeId) =>
    new Promise((resolve) => {
      if (!placesService || !placeId) {
        resolve(null);
        return;
      }

      placesService.getDetails(
        {
          placeId,
          fields: [
            "name",
            "formatted_address",
            "opening_hours",
            "formatted_phone_number",
            "rating",
            "reviews",
          ],
          language: "zh-TW",
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(place);
          } else {
            console.warn("Places API error:", status);
            resolve(null);
          }
        },
      );
    });

  const initGooglePlaces = () => {
    if (!(window.google && window.google.maps)) return;

    const dummyElement = document.createElement("div");
    dummyElement.style.display = "none";
    document.body.appendChild(dummyElement);
    map = new google.maps.Map(dummyElement);

    autocompleteService = new google.maps.places.AutocompleteService();
    placesService = new google.maps.places.PlacesService(map);
    geocoder = new google.maps.Geocoder();
  };

  const onAddressSelected = async () => {
    if (!form.value.address.trim() || !placesService || !geocoder) {
      console.info("[Places] Skip onAddressSelected", {
        hasAddress: !!form.value.address.trim(),
        hasPlacesService: !!placesService,
        hasGeocoder: !!geocoder,
      });
      return;
    }

    try {
      console.info("[Places] onAddressSelected start", {
        address: form.value.address,
        activity: form.value.activity,
        selectedPlaceId: selectedPlaceId.value,
      });

      const cacheKey = form.value.address.toLowerCase();
      if (placesCache[cacheKey]) {
        const cached = placesCache[cacheKey];
        form.value.businessHours = cached.businessHours || "";
        console.info("[Places] Cache hit", {
          cacheKey,
          businessHours: form.value.businessHours,
        });
        return;
      }

      let placeId = selectedPlaceId.value;

      if (!placeId) {
        const queryText =
          form.value.activity.trim() && form.value.address.trim()
            ? `${form.value.activity} ${form.value.address}`
            : form.value.address;

        console.info("[Places] findPlaceFromQuery", { queryText });
        const findResults = await new Promise((resolve) => {
          placesService.findPlaceFromQuery(
            {
              query: queryText,
              fields: ["place_id"],
              language: "zh-TW",
            },
            (results, status) => {
              console.info("[Places] findPlaceFromQuery result", {
                status,
                count: results?.length || 0,
              });
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                results &&
                results.length
              ) {
                resolve(results);
              } else {
                resolve([]);
              }
            },
          );
        });

        if (findResults.length > 0) {
          placeId = findResults[0].place_id;
        }
      }

      if (!placeId) {
        console.info("[Places] geocode fallback", {
          address: form.value.address,
        });
        const geocodeResults = await new Promise((resolve) => {
          geocoder.geocode(
            { address: form.value.address, language: "zh-TW" },
            (results, status) => {
              console.info("[Places] geocode result", {
                status,
                count: results?.length || 0,
              });
              if (status === google.maps.GeocoderStatus.OK) {
                resolve(results);
              } else {
                resolve([]);
              }
            },
          );
        });

        if (geocodeResults.length === 0) {
          businessInfoStatus.value = "no-place";
          return;
        }

        placeId = geocodeResults[0].place_id;
      }

      if (!placeId) return;
      selectedPlaceId.value = placeId;
      console.info("[Places] resolved placeId", { placeId });

      const placeDetails = await fetchPlaceDetails(placeId);

      if (placeDetails) {
        console.info("[Places] placeDetails", {
          name: placeDetails.name,
          formatted_address: placeDetails.formatted_address,
          hasOpeningHours: !!placeDetails.opening_hours,
        });

        const businessHours = formatBusinessHours(placeDetails.opening_hours);
        form.value.businessHours = businessHours || "";

        if (
          placeDetails.name &&
          !isLikelyAddress(placeDetails.name) &&
          (!form.value.activity.trim() ||
            form.value.activity.trim() === form.value.address.trim() ||
            isLikelyAddress(form.value.activity))
        ) {
          form.value.activity = placeDetails.name;
        }

        businessInfoStatus.value = placeDetails.opening_hours
          ? "ok"
          : "no-hours";
        console.info("[Places] business info", {
          status: businessInfoStatus.value,
          businessHours: form.value.businessHours,
        });

        const saveKey = (
          placeDetails.formatted_address || form.value.address
        ).toLowerCase();
        placesCache[saveKey] = { businessHours };
      } else {
        businessInfoStatus.value = "no-place";
        console.warn("[Places] no placeDetails", { placeId });
      }
    } catch (e) {
      console.error("Address selection error:", e);
      businessInfoStatus.value = "error";
    }
  };

  const onAddressInput = () => {
    if (!autocompleteService) return;
    const input = form.value.address.trim();
    if (!input) {
      autocompleteResults.value = [];
      selectedPlaceId.value = "";
      return;
    }

    selectedPlaceId.value = "";

    if (autocompleteTimer) {
      clearTimeout(autocompleteTimer);
    }

    autocompleteTimer = setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input,
          language: "zh-TW",
          types: ["establishment", "geocode"],
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            autocompleteResults.value = predictions.slice(0, 6);
          } else {
            autocompleteResults.value = [];
          }
        },
      );
    }, 250);
  };

  const selectAutocomplete = async (item) => {
    if (!item) return;
    autocompleteResults.value = [];
    selectedPlaceId.value = item.place_id || "";

    console.info("[Places] selectAutocomplete", {
      description: item.description,
      placeId: item.place_id,
      types: item.types,
    });

    const mainText = item.structured_formatting?.main_text || "";
    if (
      item.types?.includes("establishment") &&
      mainText &&
      !isLikelyAddress(mainText) &&
      (!form.value.activity.trim() ||
        form.value.activity.trim() === form.value.address.trim() ||
        isLikelyAddress(form.value.activity))
    ) {
      form.value.activity = mainText;
    }
    form.value.address = item.description || form.value.address;

    const placeDetails = await fetchPlaceDetails(item.place_id);
    if (placeDetails) {
      console.info("[Places] placeDetails (from select)", {
        name: placeDetails.name,
        formatted_address: placeDetails.formatted_address,
        hasOpeningHours: !!placeDetails.opening_hours,
      });

      const businessHours = formatBusinessHours(placeDetails.opening_hours);
      form.value.businessHours = businessHours || "";
      if (
        placeDetails.name &&
        !isLikelyAddress(placeDetails.name) &&
        (!form.value.activity.trim() ||
          form.value.activity.trim() === form.value.address.trim() ||
          isLikelyAddress(form.value.activity))
      ) {
        form.value.activity = placeDetails.name;
      }

      placesCache[form.value.address.toLowerCase()] = { businessHours };
      businessInfoStatus.value = placeDetails.opening_hours ? "ok" : "no-hours";
      console.info("[Places] business info (from select)", {
        status: businessInfoStatus.value,
        businessHours: form.value.businessHours,
      });
    } else {
      businessInfoStatus.value = "no-place";
      console.warn("[Places] no placeDetails (from select)", {
        placeId: item.place_id,
      });
    }
  };

  return {
    autocompleteResults,
    selectedPlaceId,
    businessInfoStatus,
    initGooglePlaces,
    onAddressSelected,
    onAddressInput,
    selectAutocomplete,
  };
};
