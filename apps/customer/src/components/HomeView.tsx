import { useState, useEffect, useMemo, useRef, FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Search, MapPin, Star, ChevronRight, Map as MapIcon, Bell, X, SlidersHorizontal, Check, Sparkles, Coffee, LayoutGrid, ChevronDown, ChevronUp, Compass, Navigation, Loader2, Globe, Clock, Armchair, Palette, Flame } from 'lucide-react';
import { MorphIcon } from 'morphicons/react';
import { Navigation as LucideNavData, NavigationOff as LucideNavOffData } from 'lucide';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState } from '../App';
import { MOCK_SHOPS, AMENITIES_CONFIG, STYLES_CONFIG, SPECIAL_MODELS_CONFIG } from '@shared/data';
import { Amenity, ShopStyle, SpecialModel, CoffeeShop } from '@shared/types';
import { ModelIcon, StyleIcon, AmenityIcon } from './ModelStyleIcons';
import { 
  VIETNAM_CITIES, 
  searchRealGooglePlaces, 
  getDeviceCoordinates, 
  calculateDistanceKm, 
  getUserLocationWithFallback, 
  recalculateShopDistances,
  watchDeviceLocation,
  resolveLocationLabel,
  GeoError,
  GEO_ERROR_KEYS
} from '@shared/services/googlePlacesService';
import { SearchController, SearchPipelineResponse } from '@shared/services/search/SearchController';
import { LocalLanguageResolver } from '@shared/services/search/LocalLanguageResolver';
import { TaxonomyService } from '@shared/services/taxonomy/TaxonomyService';
import FreeMap, { setMapLabels } from './FreeMap';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useUser } from '../context/UserContext';
import { LanguageControlButton } from './LanguageSelectorModal';
import GlowingButton from './GlowingButton';
import { api } from '../services/api';
import { CoverageStatus, LocalityPlaceDTO, LocalitySearchResponse, cellForCoords } from '@shared/locality';
import { RefreshCw, Database } from 'lucide-react';

/** Map an approved locality place into the shop shape the list/detail views already render. */
function localityToShop(p: LocalityPlaceDTO, t: (k: string, f: string) => string): CoffeeShop {
  const images = p.photos.map(ph => ph.url);
  return {
    id: `loc_${p.id}`,
    name: p.name,
    address: p.address,
    distance: '',
    rating: p.rating || 0,
    reviewCount: p.review_count,
    coverImage: images[0] || '',
    images,
    openingHours: p.opening_hours ? [{ day: t('home.openingHours', 'Giờ mở cửa'), time: p.opening_hours }] : undefined,
    moods: [],
    tags: p.categories,
    amenities: [],
    styles: [],
    specialModels: [],
    reviews: p.reviews.map(r => ({
      id: r.id,
      userId: r.source,
      userName: r.author || t('home.anonymous', 'Ẩn danh'),
      userAvatar: '',
      userSystemBadge: r.source,
      date: r.date || '',
      images: [],
      content: r.text || '',
      likes: 0,
      comments: 0,
      metrics: { noise: 0, seating: 0, accuracy: r.rating || 0 }
    })) as any,
    location: { lat: p.lat, lng: p.lng },
    phoneNumber: p.phone,
    website: p.website,
    isPartner: false,
    description: p.sources.map(s => s.attribution).filter(Boolean).join(' · ')
  };
}

const GENERIC_CAFE_QUERY = /^(qu[aá]n\s*)?(c[aà]\s*ph[eê]|cafe|caf[eé]|coffee(\s*shop)?)$/i;

const RECENT_SEARCHES_STORAGE_KEY = 'recent_searches';
const RECENT_SEARCHES_ALT_KEY = 'recentSearches';

function loadRecentSearchesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || localStorage.getItem(RECENT_SEARCHES_ALT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 5);
      }
    }
  } catch (e) {
    console.warn('Failed to read recent searches from localStorage', e);
  }
  return [];
}

function saveRecentSearchesToStorage(items: string[]) {
  const bounded = items.slice(0, 5);
  try {
    const json = JSON.stringify(bounded);
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, json);
    localStorage.setItem(RECENT_SEARCHES_ALT_KEY, json);
  } catch (e) {
    console.warn('Failed to save recent searches to localStorage', e);
  }
}

function clearRecentSearchesFromStorage() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    localStorage.removeItem(RECENT_SEARCHES_ALT_KEY);
  } catch (e) {
    console.warn('Failed to clear recent searches from localStorage', e);
  }
}

interface Props {
  shops?: CoffeeShop[];
  onAddGoogleShops?: (newShops: CoffeeShop[]) => void;
  onNavigate: (view: ViewState) => void;
  hasValidKey?: boolean;
  isMapAuthFailed?: boolean;
  isBillingError?: boolean;
  onOpenKeyConfig?: () => void;
}

type CategoryTab = 'all' | 'models' | 'styles' | 'amenities';

export default function HomeView({ 
  shops, 
  onAddGoogleShops, 
  onNavigate, 
  hasValidKey = false, 
  isMapAuthFailed = false,
  isBillingError = false,
  onOpenKeyConfig
}: Props) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { language, t, translateAmenity, translateStyle, translateModel, translateMood, translateCity, translateShop } = useLanguage();
  const { profile } = useUser();

  const baseShopList = shops && shops.length > 0 ? shops : MOCK_SHOPS;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialModel, setSelectedSpecialModel] = useState<SpecialModel | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ShopStyle | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
  const [selectedMapShop, setSelectedMapShop] = useState<CoffeeShop | null>(null);
  
  // Real Google Places & Location state
  const [selectedCity, setSelectedCity] = useState<typeof VIETNAM_CITIES[0] | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);
  const [placesNotice, setPlacesNotice] = useState<string | null>(null);
  const [locationProblem, setLocationProblem] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'city' | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locality, setLocality] = useState<LocalitySearchResponse | null>(null);
  const [localityCell, setLocalityCell] = useState<string | null>(null);
  const [isRefreshingArea, setIsRefreshingArea] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationBar, setShowLocationBar] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'reviews'>('distance');
  const [pipelineResult, setPipelineResult] = useState<any | null>(null);

  // Recent Searches state (stored in localStorage, max 5 items)
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    return loadRecentSearchesFromStorage();
  });

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 5);
      saveRecentSearchesToStorage(next);
      return next;
    });
  };

  const removeRecentSearch = (termToRemove: string, e?: ReactMouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setRecentSearches(prev => {
      const next = prev.filter(item => item.toLowerCase() !== termToRemove.toLowerCase());
      saveRecentSearchesToStorage(next);
      return next;
    });
  };

  const clearAllRecentSearches = (e?: ReactMouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setRecentSearches([]);
    clearRecentSearchesFromStorage();
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    setIsSearchDropdownOpen(false);
    saveRecentSearch(term);
    handleFetchGooglePlaces(
      currentCoords?.lat,
      currentCoords?.lng,
      term,
      locationLabel,
      selectedSpecialModel,
      selectedStyle,
      language
    );
  };

  // Close recent searches dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === RECENT_SEARCHES_STORAGE_KEY || e.key === RECENT_SEARCHES_ALT_KEY) {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              setRecentSearches(parsed.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5));
            }
          } else {
            setRecentSearches([]);
          }
        } catch {
          // ignore parsing error
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const displayedRecentSearches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentSearches.slice(0, 5);
    const matches = recentSearches.filter(item => item.toLowerCase().includes(q));
    return matches.slice(0, 5);
  }, [recentSearches, searchQuery]);

  // Execute Search Pipeline whenever searchQuery or coordinates change
  useEffect(() => {
    let isCancelled = false;

    const runPipeline = async () => {
      if (!searchQuery.trim()) {
        setPipelineResult(null);
        return;
      }
      // Plain "quán cà phê" searches in a fully covered area are answered from internal data — no paid AI/Google search.
      if (locality?.status === 'complete' && GENERIC_CAFE_QUERY.test(searchQuery.trim())) {
        setPipelineResult(null);
        return;
      }

      try {
        const res = await api.executeAiSearchPipeline({
          query: searchQuery.trim(),
          uiLanguage: language,
          latitude: currentCoords?.lat,
          longitude: currentCoords?.lng,
          cityName: locationLabel,
        });

        if (!isCancelled) {
          setPipelineResult(res);
        }
      } catch (err) {
        console.error('[HomeView] Search Pipeline execution failed:', err);
      }
    };

    const timer = setTimeout(runPipeline, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, language, currentCoords?.lat, currentCoords?.lng, locationLabel, baseShopList, locality?.status]);

  /**
   * Build the coverage sentence in the active language. The server also sends a
   * ready-made `message`, but that one is Vietnamese only, so it is ignored here.
   */
  const localityMessage = (l: LocalitySearchResponse): string => {
    const parts = [t(`locality.${l.status}`, l.message)];
    const pending = l.enrichment?.pending_review || 0;
    if (l.status === 'enriching' && pending > 0) {
      parts.push(t('locality.pendingReview', '{n} quán đang chờ kiểm duyệt').replace('{n}', String(pending)));
    }
    if (l.status !== 'complete' && l.total > 0) {
      return `${parts.join(' — ')}. ${t('locality.showing', 'Đang hiển thị {n} quán đã có.').replace('{n}', String(l.total))}`;
    }
    return parts.join(' — ');
  };

  /** Show a place name in the active language when we have a translation for it. */
  const localizePlace = (name: string): string =>
    name.split(', ').map(part => t(`cityName.${part.trim()}`, part.trim())).join(', ');

  // Map pin labels follow the UI language (the map is plain DOM, so it is told explicitly).
  useEffect(() => {
    setMapLabels(t('map.cafePin', 'Quán'), t('map.yourLocation', 'Vị trí của bạn'), t('map.noWebgl', 'Thiết bị không hỗ trợ hiển thị bản đồ (WebGL).'));
  }, [language]);

  // ---------------- Locality data (shared internal store) ----------------
  const loadLocality = async (lat: number, lng: number, enqueue = true): Promise<LocalitySearchResponse | null> => {
    // Only a ~1.1 km grid cell is sent to the server, never the exact GPS position.
    const cell = cellForCoords(lat, lng).id;
    setLocalityCell(cell);
    try {
      const res = await api.localitySearch(cell, '', 1, enqueue);
      setLocality(res);
      const shopsFromStore = res.places.filter(p => p.kind === 'locality').map(pl => localityToShop(pl, t));
      if (shopsFromStore.length && onAddGoogleShops) onAddGoogleShops(shopsFromStore);
      return res;
    } catch (err) {
      console.warn('[locality] search failed', err);
      return null;
    }
  };

  // While an area is being enriched, check back occasionally (no new jobs are created by polling).
  useEffect(() => {
    if (!currentCoords || !locality || (locality.status !== 'enriching' && locality.status !== 'partial')) return;
    let n = 0;
    const id = window.setInterval(() => {
      if (++n > 10) return window.clearInterval(id);
      loadLocality(currentCoords.lat, currentCoords.lng, false);
    }, 30000);
    return () => window.clearInterval(id);
  }, [currentCoords?.lat, currentCoords?.lng, locality?.status]);

  /** Turn the server's refresh outcome code into a sentence in the active language. */
  const refreshMessage = (r: { code?: string; message: string; retry_at?: string }): string => {
    switch (r.code) {
      case 'queued': return t('locality.refreshQueued', 'Đã gửi yêu cầu cập nhật khu vực');
      case 'joined': return t('locality.refreshJoined', 'Khu vực này đang được cập nhật');
      case 'cooldown': return t('locality.refreshCooldown', 'Khu vực vừa được cập nhật, có thể làm mới lại sau {time}')
        .replace('{time}', r.retry_at ? new Date(r.retry_at).toLocaleString() : '');
      case 'rate_limited': return t('locality.refreshRateLimited', 'Bạn đã làm mới quá nhiều lần, thử lại sau 1 giờ');
      case 'queue_full': return t('locality.refreshQueueFull', 'Hệ thống đang bận, thử lại sau');
      case 'fresh': return t('locality.refreshFresh', 'Dữ liệu khu vực vẫn còn mới');
      case 'bad_cell': return t('locality.refreshBadCell', 'Mã khu vực không hợp lệ');
      default: return r.message;   // older server build
    }
  };

  const handleRefreshArea = async () => {
    if (!localityCell || !currentCoords) return;
    setIsRefreshingArea(true);
    try {
      const r = await api.localityRefresh(localityCell);
      setPlacesNotice(refreshMessage(r));
    } catch (err: any) {
      setPlacesNotice(t('locality.refreshFailed', 'Chưa thể làm mới khu vực'));
      console.warn('[locality] refresh failed', err);
    } finally {
      await loadLocality(currentCoords.lat, currentCoords.lng, false);
      setIsRefreshingArea(false);
      setTimeout(() => setPlacesNotice(null), 4000);
    }
  };

  // Auto fetch real Google Places around specified coordinates
  const handleFetchGooglePlaces = async (
    lat: number, 
    lng: number, 
    query?: string, 
    cityName?: string,
    specialModel?: SpecialModel | null,
    style?: ShopStyle | null,
    overrideLang?: string
  ) => {
    setIsFetchingPlaces(true);
    const activeLang = overrideLang || language;
    try {
      const realPlaces = await searchRealGooglePlaces({
        lat,
        lng,
        query: query || undefined,
        specialModel: specialModel !== undefined ? specialModel : selectedSpecialModel,
        style: style !== undefined ? style : selectedStyle,
        radius: 6000,
        language: activeLang
      });

      if (realPlaces && realPlaces.some((p: any) => p.isSynthetic)) {
        // Never present generated demo shops as real places.
        const synthetic = realPlaces.map((p: any) => ({ ...p, tags: [t('home.demoData', 'Dữ liệu minh họa'), ...(p.tags || [])] }));
        if (onAddGoogleShops) onAddGoogleShops(synthetic);
        setPlacesNotice(t('home.syntheticNotice', 'Không lấy được dữ liệu từ Google — đang hiển thị quán minh họa, không phải quán thật.'));
        setTimeout(() => setPlacesNotice(null), 6000);
      } else if (realPlaces && realPlaces.length > 0) {
        if (onAddGoogleShops) {
          onAddGoogleShops(realPlaces);
        }
        const fallbackNoticeMsg = activeLang === 'zh-TW'
          ? `已成功取得周邊 ${realPlaces.length} 間 Google Maps 真實店家！`
          : activeLang === 'th'
          ? `ค้นพบ ${realPlaces.length} ร้านกาแฟจริงบน Google Maps รอบตัวคุณ!`
          : activeLang === 'en'
          ? `Fetched ${realPlaces.length} real Google Maps coffee shops near ${cityName || locationLabel}!`
          : `Đã lấy ${realPlaces.length} quán cà phê thực tế từ Google Maps quanh ${cityName || locationLabel}!`;
          
        const noticeMsg = (realPlaces as any).searchSummary || fallbackNoticeMsg;
        setPlacesNotice(noticeMsg);
        setTimeout(() => setPlacesNotice(null), 4000);
      } else {
        const notFoundMsg = activeLang === 'zh-TW'
          ? '6公里範圍內暫無更多新店家'
          : activeLang === 'th'
          ? 'ไม่พบร้านกาแฟเพิ่มเติมในรัศมี 6 กม.'
          : activeLang === 'en'
          ? 'No additional shops found within 6km radius'
          : t('home.noMoreShops', 'Không tìm thấy thêm quán mới trong bán kính 6km');
        setPlacesNotice(notFoundMsg);
        setTimeout(() => setPlacesNotice(null), 3000);
      }
    } catch (err) {
      console.error('Error fetching real Google Places:', err);
    } finally {
      setIsFetchingPlaces(false);
    }
  };

  // Auto-detect user GPS or IP location on mount
  useEffect(() => {
    let isMounted = true;
    getUserLocationWithFallback().then((loc) => {
      if (!isMounted) return;
      if (loc) {
        setCurrentCoords({ lat: loc.lat, lng: loc.lng });
        setLocationSource(loc.source === 'gps' ? 'gps' : 'ip');
        setLocationAccuracy(loc.accuracy ?? null);
        if (loc.source === 'gps') {
          setIsGpsActive(true);
          setLocationLabel(t('location.gpsYours', 'Vị trí GPS của bạn'));
          resolveLocationLabel(loc.lat, loc.lng, language).then(name => isMounted && name && setLocationLabel(localizePlace(name)));
        } else {
          setLocationLabel(`${localizePlace(loc.city)} (${t('location.approxIp', 'ước tính theo IP')})`);
          if (loc.gpsError) showLocationProblem(loc.gpsError, true);
        }
        // Internal shared data first; the paid Google search only runs when the server allows a fallback.
        loadLocality(loc.lat, loc.lng).then(res => {
          if (!isMounted) return;
          if (!res || res.allow_google_fallback) {
            api.reportGoogleFallback();
            handleFetchGooglePlaces(loc.lat, loc.lng, undefined, loc.city, selectedSpecialModel, selectedStyle, language);
          }
        });
      } else {
        setLocationLabel(t('location.choosePlease', 'Vui lòng chọn vị trí'));
        setLocationProblem(t('location.noneFound', 'Không xác định được vị trí (GPS và IP đều không phản hồi). Hãy bật định vị hoặc chọn thành phố.'));
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Explain exactly why GPS isn't working instead of silently using a wrong position.
  const showLocationProblem = (err: unknown, usingIp: boolean) => {
    const msg = err instanceof GeoError
      ? t(GEO_ERROR_KEYS[err.code] || 'geo.failed', err.message)
      : t('geo.failed', 'Không lấy được vị trí GPS.');
    setLocationProblem(usingIp ? `${msg} ${t('location.ipNotice', 'Tạm thời dùng vị trí ước tính theo IP (sai số vài km).')}` : msg);
  };

  // Live tracking: while GPS mode is on, follow the device and refresh nearby shops after moving ~1 km.
  const lastFetchPointRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!isGpsActive) return;
    if (currentCoords && !lastFetchPointRef.current) lastFetchPointRef.current = currentCoords;
    const stop = watchDeviceLocation(
      pos => {
        if (pos.accuracy) setLocationAccuracy(pos.accuracy);
        setCurrentCoords(prev => (prev && calculateDistanceKm(prev.lat, prev.lng, pos.lat, pos.lng) < 0.03 ? prev : { lat: pos.lat, lng: pos.lng }));
        const last = lastFetchPointRef.current;
        if (!last || calculateDistanceKm(last.lat, last.lng, pos.lat, pos.lng) >= 1) {
          lastFetchPointRef.current = { lat: pos.lat, lng: pos.lng };
          resolveLocationLabel(pos.lat, pos.lng, language).then(name => name && setLocationLabel(localizePlace(name)));
          loadLocality(pos.lat, pos.lng, false);
          if (last) handleFetchGooglePlaces(pos.lat, pos.lng, searchQuery || undefined, undefined, selectedSpecialModel, selectedStyle, language);
        }
      },
      err => {
        // Permission revoked or location switched off while tracking.
        if (err.code === 'denied' || err.code === 'insecure') {
          setIsGpsActive(false);
          showLocationProblem(err, false);
        }
      }
    );
    return stop;
  }, [isGpsActive]);

  // Whenever language is switched by the user, immediately re-fetch Google Places in that country's language
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (currentCoords?.lat && currentCoords?.lng && locality?.allow_google_fallback !== false) {
      handleFetchGooglePlaces(
        currentCoords?.lat,
        currentCoords?.lng,
        searchQuery || undefined,
        locationLabel,
        selectedSpecialModel,
        selectedStyle,
        language
      );
    }
  }, [language]);

  // Switch City
  const handleSelectCity = (city: typeof VIETNAM_CITIES[0]) => {
    setSelectedCity(city);
    setLocationLabel(localizePlace(city.name));
    setIsGpsActive(false);
    setLocationSource('city');
    setLocationAccuracy(null);
    setCurrentCoords({ lat: city.lat, lng: city.lng });
    handleFetchGooglePlaces(city.lat, city.lng, searchQuery || undefined, city.name, selectedSpecialModel, selectedStyle, language);
  };

  // Toggle Real Device GPS Location on and off at will
  const handleUseGps = async () => {
    // If GPS is already active, turn it OFF and revert to city coordinates
    if (isGpsActive) {
      setIsGpsActive(false);
      setLocationAccuracy(null);
      if (!selectedCity) {
        // No city chosen: stop live tracking but keep the last real position (never jump to a default city).
        setLocationSource(null);
        setPlacesNotice(t('location.gpsOffKeep', 'Đã tắt theo dõi GPS • Giữ vị trí cuối cùng'));
        setTimeout(() => setPlacesNotice(null), 3000);
        return;
      }
      setLocationSource('city');
      const targetCity = selectedCity;
      setCurrentCoords({ lat: targetCity.lat, lng: targetCity.lng });
      setLocationLabel(localizePlace(targetCity.name));
      const offMsg = language === 'vi'
        ? `Đã tắt GPS • Chuyển về ${targetCity.name}`
        : language === 'zh-TW'
        ? `已關閉 GPS • 切換至 ${targetCity.name}`
        : language === 'th'
        ? `ปิด GPS แล้ว • กลับไปที่ ${targetCity.name}`
        : `GPS disabled • Switched to ${targetCity.name}`;
      setPlacesNotice(offMsg);
      setTimeout(() => setPlacesNotice(null), 3000);
      handleFetchGooglePlaces(targetCity.lat, targetCity.lng, searchQuery || undefined, targetCity.name, selectedSpecialModel, selectedStyle, language);
      return;
    }

    // If GPS is off, turn it ON
    setIsFetchingPlaces(true);
    try {
      const coords = await getDeviceCoordinates();
      setCurrentCoords({ lat: coords.lat, lng: coords.lng });
      lastFetchPointRef.current = { lat: coords.lat, lng: coords.lng };
      setLocationProblem(null);
      setLocationSource('gps');
      setLocationAccuracy(coords.accuracy ?? null);
      setIsGpsActive(true);
      const gpsLabel = language === 'vi' 
        ? t('location.gpsYours', 'Vị trí GPS của bạn') 
        : language === 'zh-TW'
        ? '您的 GPS 位置'
        : language === 'th'
        ? 'ตำแหน่ง GPS ของคุณ'
        : 'Your GPS Location';
      setLocationLabel(gpsLabel);
      resolveLocationLabel(coords.lat, coords.lng, language).then(name => name && setLocationLabel(localizePlace(name)));
      const acc = coords.accuracy ? ` (±${coords.accuracy < 1000 ? `${Math.round(coords.accuracy)} m` : `${(coords.accuracy / 1000).toFixed(1)} km`})` : '';
      const onMsg = language === 'vi'
        ? `Đã bật GPS${acc} • Đang tìm quán gần bạn`
        : language === 'zh-TW'
        ? '已開啟 GPS • 正在搜尋您周邊店家'
        : language === 'th'
        ? 'เปิด GPS แล้ว • กำลังค้นหาร้านใกล้คุณ'
        : `GPS enabled${acc} • Searching shops near you`;
      setPlacesNotice(onMsg);
      setTimeout(() => setPlacesNotice(null), 3500);
      loadLocality(coords.lat, coords.lng, false);
      handleFetchGooglePlaces(coords.lat, coords.lng, searchQuery || undefined, gpsLabel, selectedSpecialModel, selectedStyle, language);
    } catch (err) {
      console.warn('Cannot obtain GPS:', err);
      setIsGpsActive(false);
      const loc = await getUserLocationWithFallback();
      if (loc) {
        setCurrentCoords({ lat: loc.lat, lng: loc.lng });
        setLocationSource('ip');
        setLocationAccuracy(loc.accuracy ?? null);
        setLocationLabel(`${localizePlace(loc.city)} (${t('location.approxIp', 'ước tính theo IP')})`);
        handleFetchGooglePlaces(loc.lat, loc.lng, searchQuery || undefined, loc.city, selectedSpecialModel, selectedStyle, language);
        showLocationProblem(err, true);
      } else {
        showLocationProblem(err, false);
      }
    } finally {
      setIsFetchingPlaces(false);
    }
  };

  // Handle Special Model click with live Google Places query
  const handleSelectSpecialModel = (modelId: SpecialModel | null) => {
    const nextModel = selectedSpecialModel === modelId ? null : modelId;
    setSelectedSpecialModel(nextModel);
    if (nextModel) {
      handleFetchGooglePlaces(currentCoords?.lat, currentCoords?.lng, undefined, locationLabel, nextModel, null, language);
    }
  };

  // Handle Style click with live Google Places query
  const handleSelectStyle = (styleId: ShopStyle | null) => {
    const nextStyle = selectedStyle === styleId ? null : styleId;
    setSelectedStyle(nextStyle);
    if (nextStyle) {
      handleFetchGooglePlaces(currentCoords?.lat, currentCoords?.lng, undefined, locationLabel, null, nextStyle, language);
    }
  };

  // Perform Live Google Search on Enter or Click
  const handleSearchSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      saveRecentSearch(q);
      setIsSearchDropdownOpen(false);
      handleFetchGooglePlaces(currentCoords?.lat, currentCoords?.lng, q, locationLabel, selectedSpecialModel, selectedStyle, language);
    }
  };

  const toggleAmenity = (amenity: Amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const clearAllFilters = () => {
    setSelectedSpecialModel(null);
    setSelectedStyle(null);
    setSelectedAmenities([]);
    setSearchQuery('');
  };

  const activeFiltersCount = 
    (selectedSpecialModel ? 1 : 0) + 
    (selectedStyle ? 1 : 0) + 
    selectedAmenities.length;

  // Compute accurate distances from user's current coordinate
  const shopListWithAccurateDistance = useMemo(() => {
    return recalculateShopDistances(baseShopList, currentCoords?.lat, currentCoords?.lng);
  }, [baseShopList, currentCoords?.lat, currentCoords?.lng]);

  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list: CoffeeShop[];

    if (q) {
      if (pipelineResult && pipelineResult.results && pipelineResult.results.length > 0) {
        list = pipelineResult.results;
      } else {
        // Instant local text matching fallback
        const localMatches = shopListWithAccurateDistance.filter(shop => {
          const matchName = shop.name?.toLowerCase().includes(q);
          const matchAddress = shop.address?.toLowerCase().includes(q);
          const matchDescription = shop.description?.toLowerCase().includes(q);
          const matchTags = shop.tags?.some(t => t.toLowerCase().includes(q));
          const matchStyles = shop.styles?.some(s => s.toLowerCase().includes(q));
          const matchModels = shop.specialModels?.some(m => m.toLowerCase().includes(q));
          const matchAmenities = shop.amenities?.some(a => a.toLowerCase().includes(q));
          return Boolean(matchName || matchAddress || matchDescription || matchTags || matchStyles || matchModels || matchAmenities);
        });

        if (localMatches.length > 0) {
          list = localMatches;
        } else if (pipelineResult) {
          list = pipelineResult.results || [];
        } else {
          list = [];
        }
      }
    } else {
      list = shopListWithAccurateDistance;
    }

    // Apply any secondary manual filter overrides if selected in UI
    const filtered = list.filter(shop => {
      // Special Model filter
      if (selectedSpecialModel && !shop.specialModels?.includes(selectedSpecialModel)) return false;

      // Shop Style filter
      if (selectedStyle && !shop.styles?.includes(selectedStyle)) return false;

      // Amenities are NOT a hard filter. Requiring every tick produces an empty screen
      // as soon as three or four are chosen — and a shop that has simply not declared
      // its amenities yet would disappear entirely. Instead every shop stays in the
      // list and the ones that match more are sorted to the top, with what is missing
      // shown on the card so the person decides for themselves.
      return true;
    });

    const amenityMatch = (shop: CoffeeShop) =>
      selectedAmenities.length === 0
        ? 0
        : selectedAmenities.filter(a => shop.amenities?.includes(a)).length;

    // Sắp xếp danh sách quán
    return [...filtered].sort((a, b) => {
      // Whatever else is chosen, a better amenity match comes first.
      if (selectedAmenities.length > 0) {
        const diff = amenityMatch(b) - amenityMatch(a);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'distance') {
        const getKm = (s: CoffeeShop) => {
          if (s.location && typeof s.location.lat === 'number' && typeof s.location.lng === 'number') {
            return calculateDistanceKm(currentCoords?.lat, currentCoords?.lng, s.location.lat, s.location.lng);
          }
          if (s.distance) {
            if (s.distance.includes('m') && !s.distance.includes('km')) {
              return (parseFloat(s.distance) || 0) / 1000;
            }
            return parseFloat(s.distance) || 99999;
          }
          return 99999;
        };

        const distA = getKm(a);
        const distB = getKm(b);

        // AI Hotness Analysis within 5km radius
        const isAIn5km = distA <= 5;
        const isBIn5km = distB <= 5;

        if (isAIn5km && isBIn5km) {
          // Calculate AI Hotness Score
          // 1. Proxy for 5-star reviews: (reviewCount * (rating / 5))
          // 2. Number of amenities: amenities.length * weight (e.g., 50)
          // 3. Closest prioritized: subtract distance * heavy_weight (e.g., 500)
          
          const fiveStarProxyA = (a.reviewCount || 0) * ((a.rating || 0) / 5);
          const fiveStarProxyB = (b.reviewCount || 0) * ((b.rating || 0) / 5);
          
          const amenitiesScoreA = (a.amenities?.length || 0) * 50;
          const amenitiesScoreB = (b.amenities?.length || 0) * 50;
          
          const distScoreA = distA * 500;
          const distScoreB = distB * 500;
          
          const scoreA = fiveStarProxyA + amenitiesScoreA - distScoreA;
          const scoreB = fiveStarProxyB + amenitiesScoreB - distScoreB;
          
          return scoreB - scoreA; // Higher score comes first
        }

        // Nếu một quán trong 5km và quán kia ở ngoài, quán trong 5km được xếp trước
        if (isAIn5km && !isBIn5km) return -1;
        if (!isAIn5km && isBIn5km) return 1;

        // Nếu cả 2 đều ngoài 5km thì đơn thuần sắp xếp theo khoảng cách
        return distA - distB;
      } else if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === 'reviews') {
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      return 0;
    });
  }, [shopListWithAccurateDistance, searchQuery, pipelineResult, selectedSpecialModel, selectedStyle, selectedAmenities, sortBy, currentCoords?.lat, currentCoords?.lng]);

  // Top matching shops for dropdown search results
  const dropdownShopResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return filteredShops.slice(0, 4);
  }, [searchQuery, filteredShops]);

  const handleSelectShopResult = (shop: CoffeeShop) => {
    saveRecentSearch(shop.name);
    setIsSearchDropdownOpen(false);
    onNavigate({ name: 'store', id: shop.id });
  };

  const handleDropdownSearchSubmit = () => {
    const q = searchQuery.trim();
    if (q) {
      saveRecentSearch(q);
      setIsSearchDropdownOpen(false);
      handleFetchGooglePlaces(
        currentCoords?.lat,
        currentCoords?.lng,
        q,
        locationLabel,
        selectedSpecialModel,
        selectedStyle,
        language
      );
    }
  };

  const hasDropdownContent = !searchQuery.trim()
    ? recentSearches.length > 0
    : (dropdownShopResults.length > 0 || displayedRecentSearches.length > 0 || searchQuery.trim().length > 0);

  const notifications = [
    {
      id: 1,
      title: t('notif.bookingOk', 'Đặt bàn thành công'),
      message: 'Đơn đặt bàn của bạn tại The Workshop Coffee lúc 19:00 ngày mai đã được xác nhận.',
      time: t('time.minutesAgo', '{n} phút trước').replace('{n}', '10'),
      read: false,
    },
    {
      id: 2,
      title: t('notif.newComment', 'Bình luận mới'),
      message: 'Thám Hiểm Gia đã bình luận vào bài review của bạn tại SOK - Space of K.',
      time: t('time.hoursAgo', '{n} giờ trước').replace('{n}', '2'),
      read: false,
    },
    {
      id: 3,
      title: t('notif.promoTitle', 'Quán quen có khuyến mãi'),
      message: 'Blanc. Cafe vừa tung ưu đãi giảm giá 20% cho thành viên mới. Xem ngay!',
      time: t('time.daysAgo', '{n} ngày trước').replace('{n}', '1'),
      read: true,
    }
  ];

  return (
    <div className={`flex flex-col min-h-full transition-colors duration-300 ${isLight ? 'bg-[#F0F3F7]' : 'bg-transparent'}`}>
      {/* Top Greeting & User Bar (Flows naturally with the page) */}
      <div className={`pt-5 md:pt-4 pb-3 px-4 md:px-8 border-b ${
        isLight 
          ? 'bg-gradient-to-r from-[#800020] via-[#6B0D1B] to-[#4A0E17] text-white border-red-700/60 shadow-sm' 
          : 'bg-[#120E0C] border-[#4A3B2C] text-[#EBE3DB]'
      }`}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-0.5 ${isLight ? 'text-red-200' : 'text-[#A48F7A]'}`}>
              {t('home.greeting', 'Chào bạn')}, {profile.name === 'Khách' ? t('profile.guestName', 'Khách') : profile.name} 👋
            </p>
            <h1 className="text-xl font-bold tracking-tight">
              {t('home.title', 'Khám phá không gian quán')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Control Button Modal Trigger */}
            <LanguageControlButton variant="badge" onDark={true} />

            <button 
              onClick={() => setShowNotifications(true)}
              className={`w-9 h-9 rounded-full flex items-center justify-center border relative transition-colors ${
                isLight ? 'bg-white/15 border-red-300/40 text-white' : 'bg-[#1A1510] border-[#4A3B2C] text-[#EBE3DB]'
              }`}
              title={t('nav.notifications', 'Thông báo')}
            >
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full shadow-sm"></span>
            </button>
            <div 
              className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border-2 cursor-pointer shadow-sm transition-transform active:scale-95 ${
                isLight ? 'border-red-300 bg-white/20' : 'border-[#D4AF37] bg-[#1A1510]'
              }`} 
              onClick={() => onNavigate({ name: 'profile' })}
              title={t('nav.profile', 'Hồ sơ')}
            >
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Search & Discovery Toolbar (Pins cleanly to top-0 when scrolling, completely jitter-free) */}
      <div className={`sticky top-0 z-30 py-2.5 px-4 md:px-8 border-b shadow-md backdrop-blur-xl ${
        isLight 
          ? 'bg-[#800020]/95 text-white border-red-700/60' 
          : 'bg-[#120E0C]/95 backdrop-blur-xl border-[#4A3B2C] text-[#EBE3DB]'
      }`}>
        <div className="max-w-7xl mx-auto w-full">

          {/* Search Bar & Map/Filter Toggle (ALWAYS VISIBLE & FULLY FUNCTIONAL) */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 relative">
          <div ref={searchContainerRef} className="relative flex-1">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-red-900/60' : 'text-[#7A6450]'}`} size={17} />
            <input 
              type="text" 
              placeholder={t('home.searchPlaceholder', 'Tìm tên quán hoặc địa điểm⋯')} 
              value={searchQuery}
              onFocus={() => {
                setIsSearchDropdownOpen(true);
              }}
              onClick={() => {
                setIsSearchDropdownOpen(true);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchDropdownOpen(false);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              className={`w-full rounded-xl py-2.5 pl-10 pr-20 text-xs font-medium focus:outline-none transition-all ${
                isLight 
                  ? 'bg-white border-2 border-red-700/40 text-[#1E1B18] placeholder-slate-400 focus:border-red-600 shadow-sm' 
                  : 'bg-[#1A1510] border border-[#4A3B2C] text-[#EBE3DB] placeholder-[#7A6450] focus:border-[#D4AF37]'
              }`}
            />
            {searchQuery && (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchDropdownOpen(true);
                  }}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    isLight 
                      ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' 
                      : 'text-stone-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={t('home.clearKeyword', 'Xóa từ khóa')}
                  aria-label={t('home.clearKeyword', 'Xóa từ khóa')}
                >
                  <X size={13} />
                </button>
                <button
                  type="submit"
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    isLight ? 'bg-[#800020] text-white hover:bg-[#66001a]' : 'bg-[#D4AF37] text-black hover:bg-[#b89528]'
                  }`}
                  title={t('home.searchGoogleTitle', 'Tìm kiếm quán thực tế từ Google')}
                >
                  {isFetchingPlaces ? <Loader2 size={12} className="animate-spin" /> : t('home.searchBtn', 'Tìm')}
                </button>
              </div>
            )}

            {/* Search Results & Recent Searches Dropdown with Smooth Slide-Down and Fade-In Animation */}
            <AnimatePresence>
              {isSearchDropdownOpen && hasDropdownContent && (
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ 
                    duration: 0.22, 
                    ease: [0.16, 1, 0.3, 1] 
                  }}
                  className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-2xl border overflow-hidden z-50 ${
                    isLight 
                      ? 'bg-white border-red-100 text-slate-800 divide-y divide-slate-100 shadow-red-950/15' 
                      : 'bg-[#1C1612] border-[#4A3B2C] text-[#EBE3DB] divide-y divide-white/5 shadow-black/70'
                  }`}
                >
                  {/* Matching Coffee Shop Search Results */}
                  {searchQuery.trim() && dropdownShopResults.length > 0 && (
                    <div className="py-1">
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 select-none">
                        <Coffee size={12} className={isLight ? 'text-red-900/80' : 'text-[#D4AF37]'} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>
                          {t('home.searchResults', 'Kết quả tìm kiếm')}
                        </span>
                      </div>
                      {dropdownShopResults.map((rawShop) => {
                        const shop = translateShop(rawShop);
                        return (
                        <div
                          key={shop.id}
                          onClick={() => handleSelectShopResult(shop)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer transition-colors group ${
                            isLight
                              ? 'hover:bg-red-50/70 text-slate-800'
                              : 'hover:bg-white/5 text-[#EBE3DB]'
                          }`}
                        >
                          {shop.images?.[0] ? (
                            <img
                              src={shop.images[0]}
                              alt={shop.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isLight ? 'bg-red-100/70 text-red-800' : 'bg-[#2A2018] text-[#D4AF37]'
                            }`}>
                              <Coffee size={14} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                              <span className="truncate">{shop.name}</span>
                              {shop.rating > 0 && (
                                <span className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.2 rounded font-bold shrink-0 ${
                                  isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-950/60 text-amber-300'
                                }`}>
                                <Star size={9} className="fill-amber-400 text-amber-400" />
                                {shop.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className={`text-[11px] truncate mt-0.5 ${
                            isLight ? 'text-slate-500' : 'text-[#A48F7A]'
                          }`}>
                            {shop.address || shop.district || 'TP. Hồ Chí Minh'}
                            {shop.distance !== undefined && ` • ${typeof shop.distance === 'number' ? (shop.distance < 1 ? `${Math.round(shop.distance * 1000)}m` : `${(shop.distance as number).toFixed(1)}km`) : shop.distance}`}
                          </div>
                        </div>
                        <ChevronRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5 opacity-40" />
                      </div>
                      );
                      })}
                  </div>
                )}

                {/* Recent Searches Section (when empty query or matching history available) */}
                {displayedRecentSearches.length > 0 && (
                  <div data-testid="recent-searches-dropdown" aria-label="Recent Searches">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3.5 py-2 select-none">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className={isLight ? 'text-red-900/70' : 'text-[#D4AF37]'} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>
                          {t('home.recentSearches', 'Tìm kiếm gần đây')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearAllRecentSearches}
                        className={`text-[10px] font-medium transition-colors hover:underline cursor-pointer ${
                          isLight ? 'text-slate-400 hover:text-red-600' : 'text-[#7A6450] hover:text-[#D4AF37]'
                        }`}
                      >
                        {t('home.clearAll', 'Xóa tất cả')}
                      </button>
                    </div>

                    {/* List of recent searches (max 5) */}
                    <div className="py-1">
                      {displayedRecentSearches.slice(0, 5).map((item, idx) => (
                        <div
                          key={`${item}-${idx}`}
                          data-testid="recent-search-dropdown-item"
                          onClick={() => handleSelectRecentSearch(item)}
                          className={`flex items-center justify-between px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors group ${
                            isLight
                              ? 'hover:bg-red-50/70 text-slate-700 hover:text-slate-900'
                              : 'hover:bg-white/5 text-[#D5C7B8] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <Clock 
                              size={13} 
                              className={`shrink-0 transition-colors ${
                                isLight ? 'text-slate-400 group-hover:text-red-700' : 'text-[#7A6450] group-hover:text-[#D4AF37]'
                              }`} 
                            />
                            <span className="truncate">{item}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(item, e)}
                            className={`p-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                              isLight 
                                ? 'text-slate-300 hover:text-red-600 hover:bg-red-100/50' 
                                : 'text-stone-500 hover:text-stone-200 hover:bg-white/10'
                            }`}
                            title={t('home.removeSearch', 'Xóa tìm kiếm này')}
                            aria-label={t('home.removeSearch', 'Xóa tìm kiếm này')}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Google Maps search trigger */}
                {searchQuery.trim() && (
                  <div
                    onClick={handleDropdownSearchSubmit}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
                      isLight
                        ? 'hover:bg-red-50/80 text-red-900'
                        : 'hover:bg-white/5 text-[#D4AF37]'
                    }`}
                  >
                    <Search size={13} className="shrink-0" />
                    <span className="truncate flex-1">
                      {t('home.searchBtn', 'Tìm')} &ldquo;<span className="font-bold">{searchQuery.trim()}</span>&rdquo;
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/5 dark:bg-white/10 opacity-70">
                      Enter ↵
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
          <button 
            type="button"
            onClick={handleUseGps}
            disabled={isFetchingPlaces}
            aria-pressed={isGpsActive}
            className={`relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer select-none active:scale-95 group ${
              isGpsActive
                ? isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                : isLight
                  ? 'bg-white/20 border-red-300/50 text-white hover:bg-white/30 hover:border-red-200 shadow-sm'
                  : 'bg-[#1A1510] border-[#4A3B2C] text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#231C16] shadow-sm'
            }`}
            title={
              isGpsActive 
                ? t('home.gpsOn', 'GPS: Đang BẬT (Bấm để tắt GPS)')
                : t('home.gpsOff', 'GPS: Đang TẮT (Bấm để bật GPS gần tôi)')
            }
          >
            {isFetchingPlaces ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <>
                <MorphIcon 
                  icon={isGpsActive ? LucideNavData : LucideNavOffData}
                  size={16}
                  strokeWidth={2}
                  spring="snappy"
                  className={`transition-all duration-300 ${
                    isGpsActive 
                      ? 'text-white rotate-45 scale-105' 
                      : 'opacity-85 group-hover:opacity-100 group-hover:scale-110'
                  }`}
                />
                {/* Live Status Indicator Dot */}
                <span 
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 transition-all ${
                    isLight ? 'border-[#800020]' : 'border-[#120E0C]'
                  } ${
                    isGpsActive ? 'bg-emerald-400 animate-pulse ring-1 ring-emerald-300' : 'bg-slate-400/70'
                  }`} 
                />
              </>
            )}
          </button>
          <button 
            type="button"
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center justify-center w-10 h-10 rounded-xl border relative transition-all ${
              activeFiltersCount > 0
                ? isLight ? 'bg-amber-400 text-black border-amber-300 font-bold' : 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : isLight ? 'bg-white/20 border-red-300/50 text-white' : 'bg-[#1A1510] border-[#4A3B2C] text-[#D4AF37]'
            }`}
            title={t('home.filterTitle', 'Bộ lọc chi tiết')}
          >
            <SlidersHorizontal size={17} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </form>

        {/* Current location status — shows where the app thinks you are and how it knows */}
        <div data-testid="location-status" className={`mt-2 flex items-center gap-1.5 text-[11px] min-w-0 ${isLight ? 'text-white/90' : 'text-[#CBB8A3]'}`}>
          <MapPin size={12} className="shrink-0" />
          <span className="truncate font-medium">{locationLabel || t('location.detecting', 'Đang xác định vị trí...')}</span>
          {locationSource && (
            <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              locationSource === 'gps' ? 'bg-emerald-500 text-white' : locationSource === 'ip' ? 'bg-amber-400 text-black' : 'bg-white/20'
            }`}>
              {locationSource === 'gps'
                ? `${t('location.gpsLive', 'GPS trực tiếp')}${locationAccuracy ? ` ±${locationAccuracy < 1000 ? `${Math.round(locationAccuracy)} m` : `${(locationAccuracy / 1000).toFixed(1)} km`}` : ''}`
                : locationSource === 'ip' ? t('location.byIp', 'Theo IP (ước tính)') : t('location.chosenCity', 'Thành phố đã chọn')}
            </span>
          )}
        </div>

        {/* Recent Searches Bar (Displays last 5 search queries in HomeView header) */}
        {recentSearches.length > 0 && !searchQuery.trim() && (
          <div 
            data-testid="recent-searches-bar"
            aria-label="Recent Searches"
            className="mt-2.5 pt-0.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 animate-in fade-in duration-200"
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
              isLight ? 'text-red-100' : 'text-[#A48F7A]'
            }`}>
              <Clock size={11} className={isLight ? 'text-red-200' : 'text-[#D4AF37]'} />
              <span>{t('home.recentSearches', 'Tìm kiếm gần đây')}:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              {recentSearches.slice(0, 5).map((term, idx) => (
                <div
                  key={`header-${term}-${idx}`}
                  data-testid="recent-search-chip"
                  onClick={() => handleSelectRecentSearch(term)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all border shrink-0 select-none ${
                    isLight
                      ? 'bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm shadow-xs'
                      : 'bg-[#1C1612] hover:bg-[#251D18] text-[#D5C7B8] hover:text-white border-[#4A3B2C] shadow-xs'
                  }`}
                >
                  <span className="truncate max-w-[130px]">{term}</span>
                  <button
                    type="button"
                    onClick={(e) => removeRecentSearch(term, e)}
                    className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                      isLight ? 'hover:bg-white/20 text-white/80 hover:text-white' : 'hover:bg-white/10 text-stone-400 hover:text-white'
                    }`}
                    title={`Xóa ${term}`}
                    aria-label={`Xóa ${term}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={clearAllRecentSearches}
                className={`text-[10px] underline ml-1 cursor-pointer transition-opacity opacity-80 hover:opacity-100 shrink-0 ${
                  isLight ? 'text-red-200 hover:text-white' : 'text-[#A48F7A] hover:text-[#D4AF37]'
                }`}
              >
                {t('home.clearAll', 'Xóa tất cả')}
              </button>
            </div>
          </div>
        )}

        {/* Shared locality data status */}
        {locality && (
          <div
            role="status"
            className={`mt-2 py-1.5 px-3 rounded-lg border text-[11px] font-medium flex items-center gap-2 ${
              locality.status === 'complete'
                ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
            }`}
          >
            {locality.status === 'enriching' ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Database size={13} className="shrink-0" />}
            <span className="flex-1 min-w-0">
              {localityMessage(locality)}
              {locality.attributions.length > 0 && <span className="block opacity-70 truncate">{t('locality.sources', 'Nguồn')}: {locality.attributions.map(a => a === 'Thông tin do quán đối tác cung cấp trên Mobler Shop' ? t('locality.attrPartner', a) : a).join(' · ')}</span>}
            </span>
            <button
              type="button"
              onClick={handleRefreshArea}
              disabled={isRefreshingArea}
              className="shrink-0 inline-flex items-center gap-1 font-bold underline disabled:opacity-50"
              title={t('home.refreshArea', 'Yêu cầu cập nhật dữ liệu khu vực (có giới hạn tần suất)')}
            >
              <RefreshCw size={12} className={isRefreshingArea ? 'animate-spin' : ''} /> {t('locality.refresh', 'Làm mới')}
            </button>
          </div>
        )}

        {/* Location problem: explains what to switch on, stays until dismissed */}
        {locationProblem && (
          <div role="alert" className="mt-2 py-2 px-3 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 text-[11px] leading-snug flex items-start justify-between gap-2 shadow-sm">
            <span className="flex items-start gap-1.5">
              <MapPin size={13} className="shrink-0 mt-0.5" />
              <span>{locationProblem}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <button onClick={handleUseGps} className="font-semibold underline">{t('common.retry', 'Thử lại')}</button>
              <button onClick={() => setLocationProblem(null)} aria-label={t('common.close', 'Đóng')}><X size={12} /></button>
            </span>
          </div>
        )}

        {/* Places Notification Toast */}
        {placesNotice && (
          <div className="mt-2 py-1.5 px-3 rounded-lg bg-emerald-500 text-white text-[11px] font-medium flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="shrink-0" />
              {placesNotice}
            </span>
            <button onClick={() => setPlacesNotice(null)} className="ml-2 text-white/80 hover:text-white">
              <X size={12} />
            </button>
          </div>
        )}

        {/* AI Discovery & Retrieval Engine Insight Banner */}
        {pipelineResult && searchQuery.trim() && (
          <div className={`mt-2.5 p-2.5 rounded-xl border text-xs shadow-md transition-all animate-in fade-in slide-in-from-top-1 duration-200 ${
            isLight 
              ? 'bg-amber-50/95 border-amber-300/80 text-amber-950' 
              : 'bg-[#1F1914]/95 border-[#8B6E4E]/60 text-[#EBE3DB]'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles size={13} className="text-amber-500 shrink-0" />
                <span className="text-[11px] uppercase tracking-wide">
                  {t('search.engineTitle', 'AI Information Retrieval Engine')}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLight ? 'bg-amber-200/80 text-amber-900 border-amber-300' : 'bg-[#3A2D20] text-[#D4AF37] border-[#5A4533]'
              }`}>
                {pipelineResult.total_results || filteredShops.length} {t('search.verifiedMatches', 'quán phù hợp')}
              </span>
            </div>

            {/* Extracted Intent Tags */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              {pipelineResult.search_intent?.experience_mode?.map((m: string) => (
                <span key={m} className="px-2 py-0.5 rounded-md font-bold bg-amber-500 text-black shadow-xs">
                  ✨ {m.replace(/_/g, ' ')}
                </span>
              ))}
              {pipelineResult.search_intent?.features?.map((f: string) => (
                <span key={f} className="px-2 py-0.5 rounded-md font-medium bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  ✓ {f.replace(/_/g, ' ')}
                </span>
              ))}
              {pipelineResult.search_intent?.activities?.map((a: string) => (
                <span key={a} className="px-2 py-0.5 rounded-md font-medium bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  🎯 {a.replace(/_/g, ' ')}
                </span>
              ))}
              {pipelineResult.search_language && (
                <span className="opacity-75 ml-auto text-[9px]">
                  Market: {pipelineResult.search_language.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 pb-24">
        {/* Map toggle (free OpenStreetMap-based map, no API key) */}
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setShowMap(v => !v)}
            aria-pressed={showMap}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border shadow-sm ${
              isLight ? 'bg-white border-red-200 text-[#800020]' : 'bg-[#1A1510] border-[#4A3B2C] text-[#D4AF37]'
            }`}
          >
            <MapIcon size={14} /> {showMap ? t('home.hideMap', 'Ẩn bản đồ') : t('home.showMap', 'Xem bản đồ')}
          </button>
        </div>
        {/* Google Map / Fallback Map View */}
        {showMap && (
          (
            <div className="h-72 w-full relative border-b border-slate-200 dark:border-[#4A3B2C] shadow-inner">
              <FreeMap
                center={currentCoords || (filteredShops[0]?.location ? { lat: filteredShops[0].location!.lat, lng: filteredShops[0].location!.lng } : { lat: 10.7769, lng: 106.7009 })}
                zoom={14}
                dark={!isLight}
                userLocation={currentCoords}
                markers={filteredShops.filter(sh => sh.location).map(sh => ({ id: sh.id, lat: sh.location!.lat, lng: sh.location!.lng, label: sh.name }))}
                selectedId={selectedMapShop?.id}
                onSelect={id => setSelectedMapShop(filteredShops.find(sh => sh.id === id) || null)}
              />
              
              <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-[#800020] border border-red-200 shadow-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {t('home.freeMapBadge', 'Bản đồ miễn phí ({n} điểm)').replace('{n}', String(filteredShops.filter(sh => sh.location).length))}
              </div>

              {/* Selected Shop Floating Card on Google Map */}
              {selectedMapShop && (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-white/95 dark:bg-[#1C1612]/95 backdrop-blur-md rounded-xl p-3 border border-red-200 dark:border-[#4A3B2C] shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 z-10">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={() => onNavigate({ name: 'store', id: selectedMapShop.id })}>
                    <img src={selectedMapShop.coverImage} alt={selectedMapShop.name} className="w-12 h-12 rounded-lg object-cover flex-none border border-slate-200 dark:border-[#3E3023]" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-[#EBE3DB] truncate">{selectedMapShop.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-[#A48F7A] truncate">{selectedMapShop.address}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-semibold text-[#800020] dark:text-[#D4AF37]">
                        <span>{selectedMapShop.rating > 0 ? `⭐ ${selectedMapShop.rating}` : t('shop.noRating', t('store.noReviewsYet', 'Chưa có đánh giá'))}</span>
                        <span>• {selectedMapShop.distance}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => onNavigate({ name: 'store', id: selectedMapShop.id })}
                      className="px-3 py-1.5 rounded-lg bg-[#800020] dark:bg-[#D4AF37] text-white dark:text-black text-[11px] font-bold shadow-sm"
                    >
                      {t('home.viewShop', 'Xem quán')}
                    </button>
                    <button 
                      onClick={() => setSelectedMapShop(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      title={t('nav.close', 'Đóng')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
          {/* Active Filters Summary Bar */}
          {activeFiltersCount > 0 && (
          <div className="px-4 pt-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500 font-bold uppercase">{t('home.filtering', 'Đang lọc:')}</span>
              {selectedSpecialModel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                  <ModelIcon model={selectedSpecialModel} size={12} className="text-amber-700" />
                  <span>{translateModel(selectedSpecialModel)}</span>
                  <X size={10} className="cursor-pointer" onClick={() => setSelectedSpecialModel(null)} />
                </span>
              )}
              {selectedStyle && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5">
                  <StyleIcon styleName={selectedStyle} size={12} className="text-purple-700" />
                  <span>{translateStyle(selectedStyle)}</span>
                  <X size={10} className="cursor-pointer" onClick={() => setSelectedStyle(null)} />
                </span>
              )}
              {selectedAmenities.map(am => (
                <span key={am} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                  <AmenityIcon amenity={am} size={12} className="text-emerald-700" />
                  <span>{translateAmenity(am)}</span>
                  <X size={10} className="cursor-pointer" onClick={() => toggleAmenity(am)} />
                </span>
              ))}
            </div>
            <button
              onClick={clearAllFilters}
              className="text-[10px] font-bold text-red-600 hover:underline shrink-0"
            >
              {t('home.clearFilters', 'Xóa tất cả')}
            </button>
          </div>
        )}

        {/* Recent Searches Section in Main Content View */}
        {recentSearches.length > 0 && !searchQuery.trim() && (
          <div 
            data-testid="recent-searches-section"
            aria-label="Recent Searches"
            className="pt-4 pb-2"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                <h3 className={`text-[11px] font-bold uppercase tracking-widest ${
                  isLight ? 'text-red-900' : 'text-[#A48F7A]'
                }`}>
                  {t('home.recentSearches', 'Tìm kiếm gần đây')}
                </h3>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isLight ? 'bg-red-100 text-red-800' : 'bg-[#2A2018] text-[#D4AF37]'
                }`}>
                  {recentSearches.slice(0, 5).length}/5
                </span>
              </div>
              <button
                type="button"
                onClick={clearAllRecentSearches}
                className={`text-[10px] font-semibold transition-colors hover:underline cursor-pointer ${
                  isLight ? 'text-red-700 hover:text-red-900' : 'text-[#D4AF37] hover:text-[#f0c85c]'
                }`}
              >
                {t('home.clearAll', 'Xóa tất cả')}
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentSearches.slice(0, 5).map((term, idx) => (
                <div
                  key={`main-${term}-${idx}`}
                  data-testid="recent-search-tag"
                  onClick={() => handleSelectRecentSearch(term)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shadow-xs group ${
                    isLight
                      ? 'bg-white hover:bg-red-50/70 border-slate-200 text-slate-800 hover:border-red-300'
                      : 'bg-[#1C1612] hover:bg-[#251D18] border-[#4A3B2C] text-[#EBE3DB] hover:border-[#D4AF37]'
                  }`}
                >
                  <Clock size={12} className={isLight ? 'text-slate-400 group-hover:text-red-700' : 'text-[#7A6450] group-hover:text-[#D4AF37]'} />
                  <span>{term}</span>
                  <button
                    type="button"
                    onClick={(e) => removeRecentSearch(term, e)}
                    className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                      isLight ? 'text-slate-400 hover:text-red-600 hover:bg-slate-100' : 'text-stone-500 hover:text-stone-200 hover:bg-white/10'
                    }`}
                    title={`Xóa ${term}`}
                    aria-label={`Xóa ${term}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coffee Shop List Section */}
        <div className="py-5 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
            <div className="flex items-center gap-2">
              <h2 className={`text-[11px] font-bold uppercase tracking-widest ${
                isLight ? 'text-red-900' : 'text-[#A48F7A]'
              }`}>
                {t('home.shopList', 'Danh Sách Quán')} ({filteredShops.length})
              </h2>
              {sortBy === 'distance' && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60'
                }`}>
                  <Navigation size={10} />
                  <span>{t('home.nearYou', 'Gần & Hot nhất (AI)')}</span>
                </span>
              )}
            </div>

            {/* Sort Options Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSortBy('distance')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all border ${
                  sortBy === 'distance'
                    ? isLight 
                      ? 'bg-[#800020] text-white border-red-900 shadow-sm' 
                      : 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-sm font-extrabold'
                    : isLight 
                      ? 'bg-white text-slate-700 border-slate-200 hover:border-red-300' 
                      : 'bg-[#1A1510] text-[#A48F7A] border-[#4A3B2C] hover:border-[#8B6E4E]'
                }`}
                title={t('home.sortDistanceTooltip', 'Sắp xếp thông minh: Ưu tiên gần GPS nhất + Quán Hot nhất trong 5km')}
              >
                <Navigation size={11} className={sortBy === 'distance' ? (isLight ? 'text-amber-200' : 'text-black') : ''} />
                <span>{t('home.nearYou', 'Gần & Hot nhất (AI)')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all border ${
                  sortBy === 'rating'
                    ? isLight 
                      ? 'bg-[#800020] text-white border-red-900 shadow-sm' 
                      : 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-sm font-extrabold'
                    : isLight 
                      ? 'bg-white text-slate-700 border-slate-200 hover:border-red-300' 
                      : 'bg-[#1A1510] text-[#A48F7A] border-[#4A3B2C] hover:border-[#8B6E4E]'
                }`}
                title={t('home.sortRatingTooltip', 'Sắp xếp theo điểm đánh giá cao nhất')}
              >
                <Star size={11} className={sortBy === 'rating' ? (isLight ? 'text-amber-300 fill-amber-300' : 'text-black fill-black') : ''} />
                <span>{t('home.topRated', 'Đánh giá')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('reviews')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all border ${
                  sortBy === 'reviews'
                    ? isLight 
                      ? 'bg-[#800020] text-white border-red-900 shadow-sm' 
                      : 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-sm font-extrabold'
                    : isLight 
                      ? 'bg-white text-slate-700 border-slate-200 hover:border-red-300' 
                      : 'bg-[#1A1510] text-[#A48F7A] border-[#4A3B2C] hover:border-[#8B6E4E]'
                }`}
                title={t('home.sortReviewsTooltip', 'Sắp xếp theo số lượng đánh giá')}
              >
                <Flame size={11} className={sortBy === 'reviews' ? (isLight ? 'text-amber-300 fill-amber-300' : 'text-black fill-black') : ''} />
                <span>{t('home.popular', 'Nhiều đánh giá')}</span>
              </button>

              {activeFiltersCount > 0 && (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={clearAllFilters}
                  className={`text-[11px] font-bold flex items-center uppercase tracking-wider transition-colors ml-1 ${
                    isLight ? 'text-[#800020] hover:text-red-700' : 'text-[#D4AF37] hover:text-[#B88645]'
                  }`}
                >
                  {t('home.showAll', 'Tất cả')} <ChevronRight size={14} />
                </motion.button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredShops.length > 0 ? (
              filteredShops.map((rawShop) => {
                const shop = translateShop(rawShop);
                return (
                  <GlowingButton
                    key={shop.id} 
                    onClick={() => onNavigate({ name: 'store', id: shop.id })}
                    className={`h-60 sm:h-64 !p-[2px] !rounded-2xl transition-all duration-300 hover:shadow-2xl ${
                      isLight 
                        ? 'bg-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.1)]' 
                        : 'bg-[#2A1F18] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
                    }`}
                    innerClassName="!rounded-[14px] !p-4 flex flex-col justify-between relative h-full w-full bg-slate-950 overflow-hidden"
                    title={t('home.viewShop', 'Xem chi tiết quán')}
                  >
                    {/* Background cover image */}
                    <img 
                      src={shop.coverImage} 
                      alt={shop.name} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    {/* Readable dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
                    
                    {/* Top Badges & Rating */}
                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {shop.isGoogleVerified ? (
                          <span 
                            className="w-6 h-6 rounded-full backdrop-blur-md bg-emerald-600/90 text-white shadow-md flex items-center justify-center border border-emerald-400"
                            title="Google Verified"
                          >
                            <Sparkles size={11} />
                          </span>
                        ) : shop.primaryModel ? (
                          <span 
                            className="w-6 h-6 rounded-full backdrop-blur-md bg-amber-500/90 text-black text-[11px] shadow-md flex items-center justify-center border border-amber-300"
                            title={translateModel(shop.primaryModel)}
                          >
                            <ModelIcon model={shop.primaryModel} size={13} className="text-black" />
                          </span>
                        ) : null}
                        {shop.primaryStyle && (
                          <span 
                            className="w-6 h-6 rounded-full backdrop-blur-md bg-black/60 text-white text-[11px] shadow-md flex items-center justify-center border border-white/30"
                            title={translateStyle(shop.primaryStyle)}
                          >
                            <StyleIcon styleName={shop.primaryStyle} size={13} className="text-white" />
                          </span>
                        )}
                      </div>

                      <div className="backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md bg-black/60 border border-white/20 text-white shrink-0">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold">{shop.rating > 0 ? shop.rating : t('shop.newBadge', 'Mới')}</span>
                      </div>
                    </div>

                    {/* Bottom Details inside image */}
                    <div className="relative z-10 text-white">
                      {/* Evidence / AI Reasoning Highlight snippet if present */}
                      {((rawShop as any).matchHighlight || (rawShop as any).verifiedEvidence?.[0]?.evidenceText) && (
                        <div className="mb-1.5 px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-200 backdrop-blur-xs flex items-center gap-1.5 line-clamp-1 shadow-sm">
                          <Sparkles size={11} className="text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {(rawShop as any).matchHighlight || (rawShop as any).verifiedEvidence?.[0]?.evidenceText}
                          </span>
                        </div>
                      )}

                      <h3 className="text-base font-bold leading-tight mb-1 text-white group-hover:text-amber-300 transition-colors drop-shadow-sm line-clamp-1">
                        {shop.name}
                      </h3>

                      <div className="flex items-center text-xs text-white/90">
                        <MapPin size={13} className="mr-1 shrink-0 text-amber-400" />
                        <span className="truncate">{shop.address}</span>
                        <span className="mx-1.5 opacity-60">•</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 flex items-center gap-1 bg-black/60 border border-white/25 text-amber-300 backdrop-blur-xs">
                          <Navigation size={9} />
                          {shop.distance}
                        </span>
                      </div>

                      {/* With amenities chosen, say plainly how well this shop matches
                          instead of hiding it — a shop that simply has not declared its
                          amenities is not the same as one that lacks them. */}
                      {selectedAmenities.length > 0 && (() => {
                        const missing = selectedAmenities.filter(a => !shop.amenities?.includes(a));
                        const undeclared = !shop.amenities || shop.amenities.length === 0;
                        if (missing.length === 0) {
                          return (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/85 text-white">
                              {t('home.matchAll', 'Có đủ tiện ích bạn chọn')}
                            </div>
                          );
                        }
                        return (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 border border-white/25 text-white/85 backdrop-blur-xs">
                            {undeclared
                              ? t('home.amenitiesUnknown', 'Quán chưa khai tiện ích')
                              : `${t('home.missingAmenities', 'Thiếu')}: ${missing.map(a => translateAmenity(a)).join(', ')}`}
                          </div>
                        );
                      })()}
                    </div>
                  </GlowingButton>
                );
              })
            ) : (
              <div className={`col-span-full text-center py-10 px-4 rounded-2xl border-2 border-dashed ${
                isLight ? 'bg-white border-red-200 text-slate-700 shadow-sm' : 'bg-[#14100C] border-[#3A2D20] text-[#A48F7A]'
              }`}>
                <div className="text-3xl mb-2">☕</div>
                <p className="text-sm font-bold mb-1">{t('home.noResults', 'Không tìm thấy quán phù hợp với bộ lọc')}</p>
                <p className={`text-xs mb-4 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>
                  {t('home.tryChangingFilters', 'Hãy thử điều chỉnh từ khóa tìm kiếm hoặc chọn các từ khóa gợi ý phổ biến bên dưới:')}
                </p>

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto mb-5">
                  {(language === 'zh-TW' 
                    ? ['The Workshop', '貓咪咖啡', '黑膠音樂', '深度辦公', '景觀庭園', '24小時營業']
                    : language === 'th'
                    ? ['The Workshop', 'คาเฟ่แมว', 'ดนตรีสด', 'นั่งทำงาน', 'สวนธรรมชาติ', 'เปิด 24 ชม.']
                    : language === 'en'
                    ? ['The Workshop', 'Cat Cafe', 'Acoustic', 'Work & Study', 'Garden', '24/7 Open']
                    : ['The Workshop', 'Cà phê mèo', 'Acoustic', 'Làm việc', 'Sân vườn', '24/7']
                  ).map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => {
                        setSearchQuery(kw);
                        saveRecentSearch(kw);
                        setSelectedSpecialModel(null);
                        setSelectedStyle(null);
                        setSelectedAmenities([]);
                      }}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        isLight
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100'
                          : 'bg-white/5 border-white/10 text-[#EBE3DB] hover:bg-white/10'
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center gap-2">
                  <button 
                    onClick={clearAllFilters}
                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 ${
                      isLight ? 'bg-[#800020] text-white hover:bg-[#600018]' : 'bg-[#D4AF37] text-black hover:bg-[#B39228]'
                    }`}
                  >
                    {t('home.clearFilters', 'Xóa toàn bộ bộ lọc')}
                  </button>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          : 'bg-white/10 border-white/15 text-[#EBE3DB] hover:bg-white/20'
                      }`}
                    >
                      {t('home.clearKeyword', 'Xóa từ khóa')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Advanced Filter Modal (Bộ lọc chi tiết) */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[85] flex flex-col p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-4 pt-8 border-b pb-3 border-white/20">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-amber-400" />
                {t('home.filterTitle', 'Bộ Lọc Tìm Quán Chi Tiết')}
              </h2>
              <p className="text-xs text-white/70">{t('home.filterSubtitle', 'Lọc theo Mô Hình, Phong Cách & Tiện Ích')}</p>
            </div>
            <button 
              onClick={() => setShowFilterModal(false)} 
              className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-5 text-white">
            {/* Branch 1: ⭐ MÔ HÌNH ĐẶC BIỆT */}
            <div className="bg-white/10 border border-white/15 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-amber-400" /> {t('home.tabModels', 'Mô hình đặc biệt')} ({SPECIAL_MODELS_CONFIG.length})
                </h3>
                {selectedSpecialModel && (
                  <button onClick={() => handleSelectSpecialModel(null)} className="text-[10px] text-amber-300 underline">
                    {t('home.unselect', 'Bỏ chọn')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SPECIAL_MODELS_CONFIG.map((model) => {
                  const isSelected = selectedSpecialModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleSelectSpecialModel(model.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-md'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <ModelIcon model={model.id} size={16} className={isSelected ? 'text-black' : 'text-amber-300'} />
                      <span className="truncate">{translateModel(model.name)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branch 2: 🎨 PHONG CÁCH */}
            <div className="bg-white/10 border border-white/15 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                  <Palette size={16} className="text-purple-400" /> {t('home.tabStyles', 'Phong cách')} ({STYLES_CONFIG.length})
                </h3>
                {selectedStyle && (
                  <button onClick={() => handleSelectStyle(null)} className="text-[10px] text-purple-300 underline">
                    {t('home.unselect', 'Bỏ chọn')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STYLES_CONFIG.map((style) => {
                  const isSelected = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => handleSelectStyle(style.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-purple-500 text-white border-purple-400 font-bold shadow-md'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <StyleIcon styleName={style.id} size={16} className={isSelected ? 'text-white' : 'text-purple-300'} />
                      <span className="truncate">{translateStyle(style.name)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branch 3: 🛋️ TIỆN ÍCH */}
            <div className="bg-white/10 border border-white/15 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                  <Armchair size={16} className="text-emerald-400" /> {t('home.tabAmenities', 'Tiện ích')} ({AMENITIES_CONFIG.length})
                </h3>
                {selectedAmenities.length > 0 && (
                  <button onClick={() => setSelectedAmenities([])} className="text-[10px] text-emerald-300 underline">
                    {t('home.clearFilters', 'Xóa tất cả')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES_CONFIG.map((amenity) => {
                  const isSelected = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-400 font-bold shadow-md'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <AmenityIcon amenity={amenity.id} size={16} className={isSelected ? 'text-white' : 'text-emerald-300'} />
                        <span className="truncate">{translateAmenity(amenity.name)}</span>
                      </div>
                      {isSelected && <Check size={14} strokeWidth={3} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/20 flex gap-3">
            <button
              onClick={clearAllFilters}
              className="py-3 px-4 rounded-xl border border-white/30 text-white font-bold text-xs hover:bg-white/10 transition-colors"
            >
              {t('home.reset', 'Đặt lại')}
            </button>
            <button
              onClick={() => setShowFilterModal(false)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs shadow-lg transition-all"
            >
              {t('home.applyFilters', 'Áp dụng bộ lọc')} ({filteredShops.length})
            </button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[90] flex flex-col p-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-6 pt-8">
            <h2 className="text-xl font-bold text-white">{t('common.notifications', 'Thông báo')}</h2>
            <button onClick={() => setShowNotifications(false)} className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-4 rounded-xl border bg-white/95 text-slate-900 border-red-300 relative overflow-hidden shadow-md">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm text-[#800020]">{notif.title}</h3>
                  <span className="text-[10px] text-slate-500">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-700">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
