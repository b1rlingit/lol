import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  MessageSquare,
  Users,
  Search,
  Send,
  ShieldAlert,
  UserPlus,
  UserCheck,
  UserX,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  LogOut,
  Moon,
  Sun,
  Trash2,
  Edit3,
  Reply,
  Smile,
  Image as ImageIcon,
  KeyRound,
  ZoomIn,
  Crown,
  Phone,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Plus,
  Camera,
  Globe,
  Ban,
  VolumeX,
  AlertTriangle,
  History,
  Settings,
  ArrowLeft,
  Download,
  Megaphone,
  Sparkles
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig =
  typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: 'demo-api-key',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo-project'
      };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'krug-messenger-v2';

// --- CONSTANTS & HELPERS ---
const AVATAR_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-violet-600'
];

const AVATAR_EMOJIS = ['', '👾', '🦊', '🐺', '⚡', '🔥', '👑', '🚀', '🎧', '🌙', '💎', '🍀'];

const QUICK_REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

const normalizeUsername = (raw) => {
  if (!raw) return '';
  return raw.trim().replace(/^@+/, '').toLowerCase();
};

const isCreatorUsername = (username) => normalizeUsername(username) === 'b1rl';

const CreatorBadge = ({ compact = false }) => (
  <span
    className={`inline-flex items-center space-x-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-500 font-extrabold tracking-wide flex-shrink-0 ${
      compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
    }`}
    title="Создатель мессенджера «Круг»"
  >
    <Crown className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
    <span>Создатель</span>
  </span>
);

const hashPassword = async (password, salt = 'krug_salt_v1') => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  const str = `${salt}:${password}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
};

const formatPhone = (raw) => {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  let d = digits;
  if (d.startsWith('8') && d.length === 11) d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  if (d.length >= 11) {
    return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  }
  return raw.trim();
};

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const isUserReallyOnline = (user) => {
  if (!user || !user.isOnline) return false;
  if (!user.lastSeen) return false;
  return Date.now() - user.lastSeen < 45000;
};

const formatLastSeen = (user) => {
  if (!user) return 'не в сети';
  if (isUserReallyOnline(user)) return 'в сети';
  if (!user.lastSeen) return 'не в сети';
  const diff = Date.now() - user.lastSeen;
  if (diff < 60000) return 'был(а) только что';
  if (diff < 3600000) return `был(а) ${Math.floor(diff / 60000)} мин. назад`;
  const d = new Date(user.lastSeen);
  const today = new Date();
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) {
    return `был(а) сегодня в ${timeStr}`;
  }
  return `был(а) ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в ${timeStr}`;
};

const compressImageFile = (file, maxWidth = 800, quality = 0.75) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read error'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image load error'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

const Avatar = ({
  name = '?',
  color = AVATAR_GRADIENTS[0],
  emoji = '',
  url = '',
  size = 'w-10 h-10',
  showStatus = false,
  isOnline = false
}) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className={`relative flex-shrink-0 ${size}`}>
      {url ? (
        <img
          src={url}
          alt={name}
          className={`${size} rounded-2xl object-cover shadow-sm border border-white/10`}
        />
      ) : (
        <div
          className={`${size} rounded-2xl bg-gradient-to-tr ${color} flex items-center justify-center text-white font-extrabold shadow-sm select-none`}
        >
          {emoji ? <span className="text-lg">{emoji}</span> : <span>{initial}</span>}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${
            isOnline ? 'bg-emerald-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
};

export default function App() {
  // Auth & Session States
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [activeUserUid, setActiveUserUid] = useState(() => {
    try {
      return localStorage.getItem('krug_session_uid') || '';
    } catch {
      return '';
    }
  });

  // Firestore Collections State
  const [allUsers, setAllUsers] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [messages, setMessages] = useState([]);

  // --- ONE-TIME ANNOUNCEMENTS STATE ---
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState(() => {
    try {
      const saved = localStorage.getItem('krug_dismissed_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [adminTab, setAdminTab] = useState('punishments'); // 'punishments' | 'announcements'
  const [annTitle, setAnnTitle] = useState('');
  const [annText, setAnnText] = useState('');
  const [annMainImage, setAnnMainImage] = useState('');
  const [annExtraImages, setAnnExtraImages] = useState([]);
  const [annPublishing, setAnnPublishing] = useState(false);

  // Stories States
  const [allStories, setAllStories] = useState([]);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [storyImage, setStoryImage] = useState('');
  const [storyCaption, setStoryCaption] = useState('');
  const [storyVisibility, setStoryVisibility] = useState('friends');
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState(null);

  // Unread & Notifications
  const [unreadCounts, setUnreadCounts] = useState({});
  const [incomingBanner, setIncomingBanner] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const lastNotifiedRef = useRef({});
  const initialFeedSyncedRef = useRef({});
  const bannerTimerRef = useRef(null);

  // WebRTC Calls
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // UI States
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('krug_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [sidebarTab, setSidebarTab] = useState('chats');
  const [mobileView, setMobileView] = useState('list');
  const [activePartnerUid, setActivePartnerUid] = useState('');
  const [toast, setToast] = useState('');

  // Auth Forms
  const [authMode, setAuthMode] = useState('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regAvatarColor, setRegAvatarColor] = useState(AVATAR_GRADIENTS[0]);
  const [regAvatarEmoji, setRegAvatarEmoji] = useState('');
  const [regAvatarUrl, setRegAvatarUrl] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Force Password Setup
  const [passwordlessPendingUser, setPasswordlessPendingUser] = useState(null);
  const [forceNewPassword, setForceNewPassword] = useState('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState('');
  const [forcePassSubmitting, setForcePassSubmitting] = useState(false);

  // Chat Composer
  const [messageInput, setMessageInput] = useState('');
  const [pendingImage, setPendingImage] = useState('');
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [openReactionMsgId, setOpenReactionMsgId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState('');

  // Modals & Profile
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [inspectUser, setInspectUser] = useState(null);

  // Profile Edit
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState(AVATAR_GRADIENTS[0]);
  const [editAvatarEmoji, setEditAvatarEmoji] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [newProfilePassword, setNewProfilePassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Admin Punishments
  const [selectedPunishUid, setSelectedPunishUid] = useState('');
  const [punishReason, setPunishReason] = useState('');
  const [muteMinutes, setMuteMinutes] = useState(60);

  // Refs
  const messagesEndRef = useRef(null);
  const regFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const chatImageInputRef = useRef(null);
  const storyFileInputRef = useRef(null);
  const annMainFileRef = useRef(null);
  const annExtraFileRef = useRef(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callUnsubRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? '' : prev));
    }, 3500);
  };

  const triggerIncomingBanner = (senderUser, msgText, hasImage) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setIncomingBanner({
      uid: senderUser?.uid || '',
      name: senderUser?.name || 'Новое сообщение',
      avatarColor: senderUser?.avatarColor || AVATAR_GRADIENTS[0],
      avatarEmoji: senderUser?.avatarEmoji || '',
      avatarUrl: senderUser?.avatarUrl || '',
      text: msgText ? msgText.slice(0, 65) : hasImage ? '📷 Фотография' : 'Сообщение'
    });
    bannerTimerRef.current = setTimeout(() => {
      setIncomingBanner(null);
    }, 4500);
  };

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  const updateSession = (uid) => {
    setActiveUserUid(uid);
    try {
      if (uid) localStorage.setItem('krug_session_uid', uid);
      else localStorage.removeItem('krug_session_uid');
    } catch {}
  };

  useEffect(() => {
    try {
      localStorage.setItem('krug_theme', theme);
    } catch {}
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Firebase Auth error:', err);
      }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // --- REAL-TIME PRESENCE HEARTBEAT & OFFLINE DETECTION ---
  useEffect(() => {
    const ticker = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (!authUser || !activeUserUid) return;
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', activeUserUid);

    const setPresence = (online) => {
      updateDoc(userRef, {
        isOnline: online,
        lastSeen: Date.now()
      }).catch(() => {});
    };

    const isVisible = () => document.visibilityState === 'visible';
    setPresence(isVisible());

    const heartbeat = setInterval(() => {
      if (isVisible()) {
        setPresence(true);
      }
    }, 20000);

    const handleVisibility = () => {
      setPresence(isVisible());
    };

    const handlePageHide = () => {
      setPresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      setPresence(false);
    };
  }, [authUser, activeUserUid]);

  // Users Snapshot
  useEffect(() => {
    if (!authUser) return;
    const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsub = onSnapshot(
      usersCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
        setAllUsers(list);
        setUsersLoaded(true);
      },
      (error) => {
        console.error('Users error:', error);
        setUsersLoaded(true);
      }
    );
    return () => unsub();
  }, [authUser]);

  // Friend Requests Snapshot
  useEffect(() => {
    if (!authUser) return;
    const reqCol = collection(db, 'artifacts', appId, 'public', 'data', 'friend_requests');
    const unsub = onSnapshot(
      reqCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllRequests(list);
      },
      (error) => console.error('Requests error:', error)
    );
    return () => unsub();
  }, [authUser]);

  const currentUserProfile = useMemo(() => {
    if (!activeUserUid) return null;
    return allUsers.find((u) => u.uid === activeUserUid) || null;
  }, [allUsers, activeUserUid]);

  const isAdmin = useMemo(() => {
    if (!currentUserProfile || !currentUserProfile.username) return false;
    return isCreatorUsername(currentUserProfile.username);
  }, [currentUserProfile]);

  // --- SUBSCRIBE TO ONE-TIME ANNOUNCEMENTS ---
  useEffect(() => {
    if (!authUser) return;
    const annCol = collection(db, 'artifacts', appId, 'public', 'data', 'announcements');
    const unsub = onSnapshot(
      annCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAllAnnouncements(list);
      },
      (error) => console.error('Announcements snapshot error:', error)
    );
    return () => unsub();
  }, [authUser]);

  // Sync dismissed announcements from user profile if available
  useEffect(() => {
    if (currentUserProfile?.dismissedAnnouncements?.length) {
      setDismissedAnnouncementIds((prev) => {
        const merged = Array.from(
          new Set([...prev, ...currentUserProfile.dismissedAnnouncements])
        );
        try {
          localStorage.setItem('krug_dismissed_announcements', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
  }, [currentUserProfile?.uid, currentUserProfile?.dismissedAnnouncements]);

  // Active unread one-time announcement to display on entry
  const activeAnnouncementToShow = useMemo(() => {
    if (!currentUserProfile || allAnnouncements.length === 0) return null;
    const userDismissed = currentUserProfile.dismissedAnnouncements || [];
    return (
      allAnnouncements.find(
        (ann) =>
          !dismissedAnnouncementIds.includes(ann.id) &&
          !userDismissed.includes(ann.id)
      ) || null
    );
  }, [currentUserProfile, allAnnouncements, dismissedAnnouncementIds]);

  const handleDismissAnnouncement = async (annId) => {
    if (!annId) return;
    const updated = Array.from(new Set([...dismissedAnnouncementIds, annId]));
    setDismissedAnnouncementIds(updated);
    try {
      localStorage.setItem('krug_dismissed_announcements', JSON.stringify(updated));
    } catch {}

    if (currentUserProfile?.uid) {
      const serverDismissed = Array.from(
        new Set([...(currentUserProfile.dismissedAnnouncements || []), annId])
      );
      try {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUserProfile.uid),
          { dismissedAnnouncements: serverDismissed }
        );
      } catch (err) {
        console.error('Failed to sync dismissed announcement:', err);
      }
    }
  };

  const handleAnnMainImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 960, 0.8);
      setAnnMainImage(compressed);
    } catch {
      showToast('Не удалось загрузить главную картинку');
    }
    e.target.value = '';
  };

  const handleAnnExtraImagesSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remainingSlots = Math.max(0, 4 - annExtraImages.length);
    const slice = files.slice(0, remainingSlots);
    try {
      const compressedList = await Promise.all(
        slice.map((f) => compressImageFile(f, 800, 0.75))
      );
      setAnnExtraImages((prev) => [...prev, ...compressedList].slice(0, 4));
    } catch {
      showToast('Ошибка загрузки доп. картинок');
    }
    e.target.value = '';
  };

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!isAdmin || (!annTitle.trim() && !annText.trim() && !annMainImage)) {
      showToast('Заполните заголовок, текст или добавьте картинку');
      return;
    }
    setAnnPublishing(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
        title: annTitle.trim() || 'Объявление от создателя',
        text: annText.trim(),
        mainImage: annMainImage || '',
        extraImages: annExtraImages,
        authorUsername: currentUserProfile.username,
        createdAt: Date.now()
      });
      setAnnTitle('');
      setAnnText('');
      setAnnMainImage('');
      setAnnExtraImages([]);
      showToast('Разовое объявление опубликовано для всех!');
    } catch (err) {
      console.error('Publish announcement error:', err);
      showToast('Ошибка публикации объявления');
    } finally {
      setAnnPublishing(false);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', annId));
      showToast('Объявление удалено');
    } catch (err) {
      console.error('Delete announcement error:', err);
    }
  };

  // Stories Snapshot
  useEffect(() => {
    if (!authUser) return;
    const storiesCol = collection(db, 'artifacts', appId, 'public', 'data', 'stories');
    const unsub = onSnapshot(
      storiesCol,
      (snapshot) => {
        const now = Date.now();
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => !s.expiresAt || s.expiresAt > now);
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setAllStories(list);
      },
      (error) => console.error('Stories error:', error)
    );
    return () => unsub();
  }, [authUser]);

  // Incoming Calls Snapshot
  useEffect(() => {
    if (!authUser || !activeUserUid) return;
    const callsCol = collection(db, 'artifacts', appId, 'public', 'data', 'calls');
    const unsub = onSnapshot(
      callsCol,
      (snapshot) => {
        const now = Date.now();
        const ringing = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .find(
            (c) =>
              c.calleeUid === activeUserUid &&
              c.status === 'ringing' &&
              now - (c.createdAt || 0) < 60000
          );
        setIncomingCall(ringing || null);
      },
      (error) => console.error('Calls error:', error)
    );
    return () => unsub();
  }, [authUser, activeUserUid]);

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      setCallSeconds(0);
      return;
    }
    const interval = setInterval(() => setCallSeconds((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Admin Logs
  useEffect(() => {
    if (!authUser || !isAdmin) {
      setAdminLogs([]);
      return;
    }
    const logsCol = collection(db, 'artifacts', appId, 'public', 'data', 'admin_logs');
    const unsub = onSnapshot(
      logsCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAdminLogs(list);
      },
      (err) => console.error('Logs error:', err)
    );
    return () => unsub();
  }, [authUser, isAdmin]);

  const activeChatId = useMemo(() => {
    if (!activeUserUid || !activePartnerUid) return '';
    return [activeUserUid, activePartnerUid].sort().join('_');
  }, [activeUserUid, activePartnerUid]);

  // Messages Snapshot
  useEffect(() => {
    if (!authUser || !activeChatId) {
      setMessages([]);
      return;
    }
    const msgCol = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'chats',
      activeChatId,
      'messages'
    );
    const unsub = onSnapshot(
      msgCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setMessages(list);

        // Mark incoming unread messages as read ONLY when chat is actively open and tab is visible
        if (
          activeUserUid &&
          activePartnerUid &&
          activePartnerUid !== activeUserUid &&
          document.visibilityState === 'visible'
        ) {
          list.forEach((m) => {
            if (m.senderUid === activePartnerUid && !m.isRead) {
              updateDoc(doc(msgCol, m.id), {
                isRead: true,
                readAt: Date.now()
              }).catch(() => {});
            }
          });
        }
      },
      (err) => console.error('Messages error:', err)
    );
    return () => unsub();
  }, [authUser, activeChatId, activeUserUid, activePartnerUid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChatId]);

  useEffect(() => {
    if (activePartnerUid) {
      setUnreadCounts((prev) => {
        if (!prev[activePartnerUid]) return prev;
        const copy = { ...prev };
        delete copy[activePartnerUid];
        return copy;
      });
    }
  }, [activePartnerUid]);

  const myFriendUids = useMemo(() => {
    if (!activeUserUid) return [];
    const uids = new Set();
    allRequests.forEach((r) => {
      if (r.status === 'accepted') {
        if (r.fromUid === activeUserUid) uids.add(r.toUid);
        if (r.toUid === activeUserUid) uids.add(r.fromUid);
      }
    });
    return Array.from(uids);
  }, [allRequests, activeUserUid]);

  const myFriends = useMemo(() => {
    return allUsers.filter((u) => myFriendUids.includes(u.uid));
  }, [allUsers, myFriendUids]);

  // Global unread notifier across friend chats
  useEffect(() => {
    if (!authUser || !activeUserUid || myFriendUids.length === 0) return;
    const unsubs = myFriendUids.map((friendUid) => {
      const chatId = [activeUserUid, friendUid].sort().join('_');
      const msgCol = collection(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'chats',
        chatId,
        'messages'
      );
      return onSnapshot(msgCol, (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        if (!initialFeedSyncedRef.current[friendUid]) {
          initialFeedSyncedRef.current[friendUid] = true;
          const last = docs[docs.length - 1];
          if (last) lastNotifiedRef.current[friendUid] = last.id;
          return;
        }

        const latest = docs[docs.length - 1];
        if (
          latest &&
          latest.id !== lastNotifiedRef.current[friendUid] &&
          latest.senderUid === friendUid
        ) {
          lastNotifiedRef.current[friendUid] = latest.id;
          const isViewing =
            activePartnerUid === friendUid &&
            (mobileView === 'chat' || window.innerWidth >= 640) &&
            document.visibilityState === 'visible';
          if (!isViewing) {
            const unreadTotal = docs.filter(
              (m) => m.senderUid === friendUid && !m.isRead
            ).length;
            setUnreadCounts((prev) => ({
              ...prev,
              [friendUid]: Math.max(unreadTotal, (prev[friendUid] || 0) + 1)
            }));
            playNotificationSound();
            const senderObj = allUsers.find((u) => u.uid === friendUid);
            triggerIncomingBanner(
              senderObj || { uid: friendUid, name: latest.senderName },
              latest.text,
              Boolean(latest.imageUrl)
            );
          }
        }
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [authUser, activeUserUid, myFriendUids.join(','), activePartnerUid, mobileView, allUsers]);

  const incomingRequests = useMemo(() => {
    if (!activeUserUid) return [];
    return allRequests.filter((r) => r.toUid === activeUserUid && r.status === 'pending');
  }, [allRequests, activeUserUid]);

  const storyGroups = useMemo(() => {
    if (!activeUserUid) return [];
    const visible = allStories.filter((s) => {
      if (s.ownerUid === activeUserUid) return true;
      if (s.visibility === 'all') return true;
      return myFriendUids.includes(s.ownerUid);
    });
    const map = new Map();
    visible.forEach((s) => {
      if (!map.has(s.ownerUid)) {
        const owner = allUsers.find((u) => u.uid === s.ownerUid);
        if (owner) map.set(s.ownerUid, { owner, stories: [] });
      }
      if (map.has(s.ownerUid)) {
        map.get(s.ownerUid).stories.push(s);
      }
    });
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.owner.uid === activeUserUid) return -1;
      if (b.owner.uid === activeUserUid) return 1;
      return 0;
    });
    return groups;
  }, [allStories, activeUserUid, myFriendUids, allUsers]);

  // Story Handlers
  const handleStoryImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 900, 0.78);
      setStoryImage(compressed);
    } catch {
      showToast('Ошибка загрузки фото');
    }
    e.target.value = '';
  };

  const handlePublishStory = async (e) => {
    e.preventDefault();
    if (!activeUserUid || (!storyImage && !storyCaption.trim())) return;
    const effectiveVisibility = isAdmin && storyVisibility === 'all' ? 'all' : 'friends';
    setStorySubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stories'), {
        ownerUid: activeUserUid,
        imageUrl: storyImage || '',
        caption: storyCaption.trim(),
        visibility: effectiveVisibility,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      });
      setStoryImage('');
      setStoryCaption('');
      setStoryVisibility('friends');
      setIsStoryCreatorOpen(false);
      showToast('Сторис опубликована!');
    } catch (err) {
      console.error('Story publish error:', err);
    } finally {
      setStorySubmitting(false);
    }
  };

  const handleDeleteStory = async (storyId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stories', storyId));
      setViewingStoryGroup(null);
      showToast('Сторис удалена');
    } catch (err) {
      console.error('Delete story error:', err);
    }
  };

  // WebRTC Call Handlers
  const cleanupCallMedia = () => {
    if (callUnsubRef.current) {
      callUnsubRef.current();
      callUnsubRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setIsMicMuted(false);
    setIsCamOff(false);
  };

  const startCall = async (partner, callType = 'audio') => {
    if (!activeUserUid || !partner || partner.uid === activeUserUid) return;
    cleanupCallMedia();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remoteStream = new MediaStream();
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };

      const callDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'calls'));
      const callerCandidates = [];
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          callerCandidates.push(e.candidate.toJSON());
          updateDoc(callDocRef, { callerCandidates }).catch(() => {});
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await setDoc(callDocRef, {
        callerUid: activeUserUid,
        callerName: currentUserProfile.name,
        callerUsername: currentUserProfile.username,
        calleeUid: partner.uid,
        type: callType,
        status: 'ringing',
        offer: { type: offer.type, sdp: offer.sdp },
        callerCandidates: [],
        calleeCandidates: [],
        createdAt: Date.now()
      });

      setActiveCall({
        id: callDocRef.id,
        partnerUid: partner.uid,
        type: callType,
        role: 'caller',
        status: 'ringing'
      });

      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }, 100);

      let applied = 0;
      const unsub = onSnapshot(callDocRef, async (snap) => {
        if (!snap.exists()) {
          cleanupCallMedia();
          setActiveCall(null);
          return;
        }
        const data = snap.data();
        if (data.status === 'ended' || data.status === 'rejected') {
          showToast(data.status === 'rejected' ? 'Вызов отклонён' : 'Звонок завершён');
          cleanupCallMedia();
          setActiveCall(null);
          return;
        }
        if (data.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
        }
        const cands = data.calleeCandidates || [];
        while (applied < cands.length) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cands[applied]));
          } catch {}
          applied++;
        }
      });
      callUnsubRef.current = unsub;
    } catch (err) {
      console.error('Call error:', err);
      cleanupCallMedia();
      showToast('Нет доступа к камере/микрофону');
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    const callData = incomingCall;
    setIncomingCall(null);
    cleanupCallMedia();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.type === 'video'
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remoteStream = new MediaStream();
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };

      const callDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'calls', callData.id);
      const calleeCandidates = [];
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          calleeCandidates.push(e.candidate.toJSON());
          updateDoc(callDocRef, { calleeCandidates }).catch(() => {});
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(callDocRef, {
        status: 'connected',
        answer: { type: answer.type, sdp: answer.sdp }
      });

      setActiveCall({
        id: callData.id,
        partnerUid: callData.callerUid,
        type: callData.type,
        role: 'callee',
        status: 'connected'
      });

      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }, 100);

      let applied = 0;
      const unsub = onSnapshot(callDocRef, async (snap) => {
        if (!snap.exists()) {
          cleanupCallMedia();
          setActiveCall(null);
          return;
        }
        const data = snap.data();
        if (data.status === 'ended') {
          showToast('Звонок завершён');
          cleanupCallMedia();
          setActiveCall(null);
          return;
        }
        const cands = data.callerCandidates || [];
        while (applied < cands.length) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cands[applied]));
          } catch {}
          applied++;
        }
      });
      callUnsubRef.current = unsub;
    } catch (err) {
      console.error('Accept call error:', err);
      cleanupCallMedia();
    }
  };

  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'calls', incomingCall.id), {
        status: 'rejected'
      });
    } catch {}
    setIncomingCall(null);
  };

  const endActiveCall = async () => {
    if (activeCall?.id) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'calls', activeCall.id), {
          status: 'ended'
        });
      } catch {}
    }
    cleanupCallMedia();
    setActiveCall(null);
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !isMicMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    setIsMicMuted(next);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const next = !isCamOff;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    setIsCamOff(next);
  };

  // Image Handlers
  const handleAvatarUpload = async (e, target = 'reg') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 320, 0.8);
      if (target === 'reg') setRegAvatarUrl(compressed);
      else setEditAvatarUrl(compressed);
    } catch {
      showToast('Ошибка загрузки фото');
    }
    e.target.value = '';
  };

  const handleChatImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 900, 0.78);
      setPendingImage(compressed);
    } catch {
      showToast('Ошибка загрузки');
    }
    e.target.value = '';
  };

  // Auth Submit Handlers
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    const rawId = loginIdentifier.trim();
    if (!rawId) {
      setLoginError('Введите @username или телефон');
      return;
    }
    const normUser = normalizeUsername(rawId);
    const normPhone = formatPhone(rawId);

    const matched = allUsers.find(
      (u) =>
        normalizeUsername(u.username) === normUser ||
        (normPhone && u.phone === normPhone) ||
        u.phone === rawId
    );

    if (!matched) {
      setLoginError('Аккаунт не найден');
      return;
    }
    if (matched.punishment?.isBanned && !isCreatorUsername(matched.username)) {
      setLoginError(`Аккаунт заблокирован: ${matched.punishment.banReason || 'Нарушение правил'}`);
      return;
    }
    if (!matched.passwordHash) {
      setPasswordlessPendingUser(matched);
      setForceNewPassword('');
      setForceConfirmPassword('');
      return;
    }
    if (!loginPassword) {
      setLoginError('Введите пароль');
      return;
    }

    setAuthSubmitting(true);
    try {
      const enteredHash = await hashPassword(loginPassword);
      if (enteredHash !== matched.passwordHash) {
        setLoginError('Неверный пароль');
        setAuthSubmitting(false);
        return;
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', matched.uid), {
        isOnline: true,
        lastSeen: Date.now()
      });
      updateSession(matched.uid);
      setLoginPassword('');
      showToast(`С возвращением, ${matched.name}!`);
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Ошибка входа');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    const cleanName = regName.trim();
    const cleanUser = normalizeUsername(regUsername);
    const cleanPhone = formatPhone(regPhone);

    if (!cleanName || cleanName.length < 2) {
      setLoginError('Укажите имя');
      return;
    }
    if (!cleanUser || !/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      setLoginError('Юзернейм: 3–20 латинских букв, цифр или _');
      return;
    }
    if (allUsers.some((u) => normalizeUsername(u.username) === cleanUser)) {
      setLoginError(`Юзернейм @${cleanUser} занят`);
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setLoginError('Пароль минимум 4 символа');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setLoginError('Пароли не совпадают');
      return;
    }

    setAuthSubmitting(true);
    try {
      const passwordHash = await hashPassword(regPassword);
      const newDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
      const newUserObj = {
        uid: newDocRef.id,
        name: cleanName,
        username: cleanUser,
        phone: cleanPhone || '+7 (900) 000-00-00',
        bio: isCreatorUsername(cleanUser) ? 'Создатель мессенджера «Круг»' : 'В приватном круге',
        avatarColor: regAvatarColor,
        avatarEmoji: regAvatarEmoji,
        avatarUrl: regAvatarUrl,
        passwordHash,
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
        punishment: {
          isBanned: false,
          banReason: '',
          isMuted: false,
          muteUntil: 0,
          warns: 0
        }
      };

      await setDoc(newDocRef, newUserObj);
      setAllUsers((prev) => [...prev.filter((u) => u.uid !== newDocRef.id), newUserObj]);
      updateSession(newDocRef.id);
      setAuthSubmitting(false);
      showToast('Аккаунт успешно создан!');
    } catch (err) {
      console.error('Register error:', err);
      setLoginError('Ошибка регистрации');
      setAuthSubmitting(false);
    }
  };

  const handleForceSetPassword = async (e) => {
    e.preventDefault();
    setLoginError('');
    const target = passwordlessPendingUser || currentUserProfile;
    if (!target) return;
    if (!forceNewPassword || forceNewPassword.length < 4) {
      setLoginError('Минимум 4 символа');
      return;
    }
    if (forceNewPassword !== forceConfirmPassword) {
      setLoginError('Пароли не совпадают');
      return;
    }
    setForcePassSubmitting(true);
    try {
      const passwordHash = await hashPassword(forceNewPassword);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', target.uid), {
        passwordHash,
        isOnline: true,
        lastSeen: Date.now()
      });
      updateSession(target.uid);
      setPasswordlessPendingUser(null);
      showToast('Пароль сохранён!');
    } catch (err) {
      console.error('Password error:', err);
    } finally {
      setForcePassSubmitting(false);
    }
  };

  const handleLogout = () => {
    cleanupCallMedia();
    setActiveCall(null);
    if (activeUserUid) {
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', activeUserUid), {
        isOnline: false,
        lastSeen: Date.now()
      }).catch(() => {});
    }
    updateSession('');
    setActivePartnerUid('');
    setPasswordlessPendingUser(null);
    showToast('Вы вышли');
  };

  const sendFriendRequest = async (targetUser) => {
    if (!activeUserUid || !targetUser || targetUser.uid === activeUserUid) return;
    const existing = allRequests.find(
      (r) =>
        (r.fromUid === activeUserUid && r.toUid === targetUser.uid) ||
        (r.fromUid === targetUser.uid && r.toUid === activeUserUid)
    );
    if (existing) {
      showToast('Заявка уже отправлена');
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'friend_requests'), {
        fromUid: activeUserUid,
        toUid: targetUser.uid,
        status: 'pending',
        createdAt: Date.now()
      });
      showToast(`Заявка отправлена @${targetUser.username}`);
    } catch (err) {
      console.error('Request error:', err);
    }
  };

  const respondFriendRequest = async (reqId, accept) => {
    try {
      if (accept) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', reqId),
          { status: 'accepted', acceptedAt: Date.now() }
        );
        showToast('Добавлен в друзья!');
      } else {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', reqId));
        showToast('Заявка отклонена');
      }
    } catch (err) {
      console.error('Respond error:', err);
    }
  };

  const removeFriend = async (friendUid) => {
    const req = allRequests.find(
      (r) =>
        r.status === 'accepted' &&
        ((r.fromUid === activeUserUid && r.toUid === friendUid) ||
          (r.fromUid === friendUid && r.toUid === activeUserUid))
    );
    if (!req) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', req.id));
      if (activePartnerUid === friendUid) setActivePartnerUid('');
      showToast('Удален из друзей');
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (
      (!messageInput.trim() && !pendingImage) ||
      !activeUserUid ||
      !currentUserProfile ||
      !activeChatId
    )
      return;

    const myPunish = currentUserProfile.punishment || {};
    if (myPunish.isBanned && !isAdmin) {
      showToast('Аккаунт заблокирован');
      return;
    }
    if (myPunish.isMuted && !isAdmin) {
      if (!myPunish.muteUntil || myPunish.muteUntil > Date.now()) {
        showToast('Вам выдан мут');
        return;
      }
    }

    const msgCol = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'chats',
      activeChatId,
      'messages'
    );
    try {
      if (editingMsg) {
        await updateDoc(doc(msgCol, editingMsg.id), {
          text: messageInput.trim(),
          editedAt: Date.now()
        });
        setEditingMsg(null);
        setMessageInput('');
        return;
      }

      await addDoc(msgCol, {
        senderUid: activeUserUid,
        senderName: currentUserProfile.name,
        text: messageInput.trim(),
        imageUrl: pendingImage || '',
        isRead: activePartnerUid === activeUserUid,
        replyTo: replyToMsg
          ? {
              id: replyToMsg.id,
              senderName: replyToMsg.senderName,
              text: replyToMsg.text || '📷 Фото'
            }
          : null,
        reactions: {},
        createdAt: Date.now()
      });
      setMessageInput('');
      setPendingImage('');
      setReplyToMsg(null);
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const toggleReaction = async (msg, emoji) => {
    if (!activeChatId || !activeUserUid) return;
    const msgRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'chats',
      activeChatId,
      'messages',
      msg.id
    );
    const reactions = { ...(msg.reactions || {}) };
    const list = reactions[emoji] || [];
    if (list.includes(activeUserUid)) {
      reactions[emoji] = list.filter((u) => u !== activeUserUid);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...list, activeUserUid];
    }
    setOpenReactionMsgId(null);
    try {
      await updateDoc(msgRef, { reactions });
    } catch {}
  };

  const handleDeleteMessage = async (msgId) => {
    if (!activeChatId) return;
    try {
      await deleteDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'chats', activeChatId, 'messages', msgId)
      );
    } catch {}
  };

  const openProfileModal = () => {
    if (!currentUserProfile) return;
    setEditName(currentUserProfile.name || '');
    setEditUsername(currentUserProfile.username || '');
    setEditPhone(currentUserProfile.phone || '');
    setEditBio(currentUserProfile.bio || '');
    setEditAvatarColor(currentUserProfile.avatarColor || AVATAR_GRADIENTS[0]);
    setEditAvatarEmoji(currentUserProfile.avatarEmoji || '');
    setEditAvatarUrl(currentUserProfile.avatarUrl || '');
    setNewProfilePassword('');
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUserProfile) return;
    const cleanName = editName.trim();
    const cleanUser = normalizeUsername(editUsername);
    if (!cleanName || !cleanUser) return;

    setProfileSaving(true);
    try {
      const updates = {
        name: cleanName,
        username: cleanUser,
        phone: formatPhone(editPhone) || currentUserProfile.phone,
        bio: editBio.trim(),
        avatarColor: editAvatarColor,
        avatarEmoji: editAvatarEmoji,
        avatarUrl: editAvatarUrl
      };
      if (newProfilePassword.trim().length >= 4) {
        updates.passwordHash = await hashPassword(newProfilePassword.trim());
      }
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUserProfile.uid),
        updates
      );
      setIsProfileModalOpen(false);
      showToast('Профиль сохранён!');
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const executeAdminAction = async (actionType) => {
    if (!isAdmin || !selectedPunishUid) return;
    const target = allUsers.find((u) => u.uid === selectedPunishUid);
    if (!target || target.uid === activeUserUid) return;

    const currentP = target.punishment || {
      isBanned: false,
      banReason: '',
      isMuted: false,
      muteUntil: 0,
      warns: 0
    };
    const nextP = { ...currentP };
    const reasonText = punishReason.trim() || 'Решение создателя';
    let logLabel = '';

    if (actionType === 'mute') {
      nextP.isMuted = true;
      nextP.muteUntil = muteMinutes === 0 ? 0 : Date.now() + muteMinutes * 60 * 1000;
      logLabel = `Мут (${muteMinutes} мин)`;
    } else if (actionType === 'warn') {
      const warns = (currentP.warns || 0) + 1;
      nextP.warns = warns;
      if (warns >= 3) {
        nextP.isBanned = true;
        nextP.banReason = `Автобан (3 варна): ${reasonText}`;
        logLabel = 'Варн 3/3 -> Бан';
      } else {
        logLabel = `Варн (${warns}/3)`;
      }
    } else if (actionType === 'ban') {
      nextP.isBanned = true;
      nextP.banReason = reasonText;
      logLabel = 'Бан';
    } else if (actionType === 'pardon') {
      nextP.isBanned = false;
      nextP.banReason = '';
      nextP.isMuted = false;
      nextP.muteUntil = 0;
      nextP.warns = 0;
      logLabel = 'Помилование';
    }

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', target.uid), {
        punishment: nextP
      });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'admin_logs'), {
        adminUsername: currentUserProfile.username,
        targetUid: target.uid,
        targetUsername: target.username,
        action: logLabel,
        reason: reasonText,
        createdAt: Date.now()
      });
      setPunishReason('');
      showToast(`Применено к @${target.username}: ${logLabel}`);
    } catch (err) {
      console.error('Admin action error:', err);
    }
  };

  const searchedUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const handle = normalizeUsername(q);
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && normalizeUsername(u.username).includes(handle)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
    );
  }, [allUsers, searchQuery]);

  const activePartner = useMemo(() => {
    if (!activePartnerUid) return null;
    return allUsers.find((u) => u.uid === activePartnerUid) || null;
  }, [allUsers, activePartnerUid]);

  const isSavedMessages = activePartnerUid && activePartnerUid === activeUserUid;

  // --- LOADING SCREEN ---
  if (authLoading || (authUser && !usersLoaded)) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style>{`
          @keyframes krugFloat {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-8px) scale(1.04); }
          }
          @keyframes krugLoadBar {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
        <div className="absolute w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl animate-pulse" />
        <div className="relative z-10 flex flex-col items-center space-y-5">
          <div
            className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30"
            style={{ animation: 'krugFloat 2.4s ease-in-out infinite' }}
          >
            <MessageSquare className="w-9 h-9 text-white" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Круг</h1>
            <p className="text-xs font-semibold text-gray-400">Синхронизация...</p>
          </div>
          <div className="w-48 h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
              style={{ animation: 'krugLoadBar 1.6s ease-in-out infinite' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // --- BANNED SCREEN ---
  if (currentUserProfile && currentUserProfile.punishment?.isBanned && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 border border-rose-500/40 rounded-3xl p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <Ban className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-rose-500">Аккаунт заблокирован</h1>
          <p className="text-xs text-gray-400">
            {currentUserProfile.punishment.banReason || 'Нарушение правил'}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold"
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  // --- MANDATORY PASSWORD SETUP ---
  const accountRequiringPassword =
    passwordlessPendingUser ||
    (currentUserProfile && !currentUserProfile.passwordHash ? currentUserProfile : null);

  if (accountRequiringPassword) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleForceSetPassword}
          className="w-full max-w-md bg-gray-900 border border-amber-500/40 rounded-3xl p-6 space-y-5 shadow-2xl"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">Придумайте пароль</h2>
              <p className="text-xs text-gray-400">Для @{accountRequiringPassword.username}</p>
            </div>
          </div>
          {loginError && (
            <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 text-xs font-semibold">
              {loginError}
            </div>
          )}
          <input
            type="password"
            required
            placeholder="Новый пароль"
            value={forceNewPassword}
            onChange={(e) => setForceNewPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-sm outline-none"
          />
          <input
            type="password"
            required
            placeholder="Повторите пароль"
            value={forceConfirmPassword}
            onChange={(e) => setForceConfirmPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={forcePassSubmitting}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-extrabold"
          >
            Сохранить и войти
          </button>
        </form>
      </div>
    );
  }

  // --- AUTH SCREEN ---
  if (!currentUserProfile) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center mx-auto shadow-xl">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Круг</h1>
            <p className="text-xs text-gray-400">Приватный мессенджер среди друзей</p>
          </div>

          <div className="flex bg-gray-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setLoginError(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                authMode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setLoginError(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                authMode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400'
              }`}
            >
              Регистрация
            </button>
          </div>

          {loginError && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {loginError}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                  @username или телефон
                </label>
                <input
                  type="text"
                  required
                  placeholder="@b1rl"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Пароль</label>
                <input
                  type="password"
                  required
                  placeholder="Пароль"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg disabled:opacity-50"
              >
                {authSubmitting ? 'Вход...' : 'Войти'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Имя</label>
                  <input
                    type="text"
                    required
                    placeholder="Имя"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">@username</label>
                  <input
                    type="text"
                    required
                    placeholder="b1rl"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Телефон</label>
                <input
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Пароль</label>
                  <input
                    type="password"
                    required
                    placeholder="Мин. 4 символа"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Повтор</label>
                  <input
                    type="password"
                    required
                    placeholder="Повтор"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold uppercase text-gray-400 block">Аватар</label>
                <div className="flex items-center space-x-3">
                  <Avatar
                    name={regName || '?'}
                    color={regAvatarColor}
                    emoji={regAvatarEmoji}
                    url={regAvatarUrl}
                    size="w-12 h-12"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex space-x-1 overflow-x-auto pb-1">
                      {AVATAR_GRADIENTS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => { setRegAvatarColor(g); setRegAvatarUrl(''); }}
                          className={`w-6 h-6 rounded-full bg-gradient-to-tr ${g} flex-shrink-0 ring-2 ${
                            regAvatarColor === g && !regAvatarUrl ? 'ring-white' : 'ring-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={regAvatarEmoji}
                        onChange={(e) => { setRegAvatarEmoji(e.target.value); setRegAvatarUrl(''); }}
                        className="bg-gray-800 text-xs px-2 py-1 rounded-xl outline-none border border-gray-700"
                      >
                        <option value="">Эмодзи</option>
                        {AVATAR_EMOJIS.filter(Boolean).map((em) => (
                          <option key={em} value={em}>{em}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => regFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-xl bg-gray-800 text-[11px] font-bold text-indigo-400 flex items-center space-x-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Фото</span>
                      </button>
                      <input
                        ref={regFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarUpload(e, 'reg')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg disabled:opacity-50 mt-2"
              >
                {authSubmitting ? 'Создание...' : 'Зарегистрироваться'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN MESSENGER DASHBOARD ---
  return (
    <div
      className={`min-h-screen ${
        theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
      } flex flex-col font-sans select-none overflow-hidden`}
    >
      <style>{`
        @keyframes msgSendPop {
          0% { opacity: 0; transform: translateY(14px) translateX(10px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) translateX(0) scale(1); }
        }
        @keyframes msgRecvPop {
          0% { opacity: 0; transform: translateY(14px) translateX(-10px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) translateX(0) scale(1); }
        }
        @keyframes modalZoomIn {
          0% { opacity: 0; transform: scale(0.93) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes chatFadeSlide {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes bannerDrop {
          0% { opacity: 0; transform: translate(-50%, -24px) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-msg-mine { animation: msgSendPop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .animate-msg-theirs { animation: msgRecvPop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .animate-modal-pop { animation: modalZoomIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-chat-switch { animation: chatFadeSlide 0.25s ease-out both; }
        .animate-banner-drop { animation: bannerDrop 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {/* Incoming New Message Top Banner */}
      {incomingBanner && (
        <div
          onClick={() => {
            if (incomingBanner.uid) {
              setActivePartnerUid(incomingBanner.uid);
              setMobileView('chat');
            }
            setIncomingBanner(null);
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-gray-900/95 backdrop-blur-md text-white border border-indigo-500/40 p-3 rounded-2xl shadow-2xl flex items-center space-x-3 cursor-pointer animate-banner-drop hover:border-indigo-400 transition"
        >
          <Avatar
            name={incomingBanner.name}
            color={incomingBanner.avatarColor}
            emoji={incomingBanner.avatarEmoji}
            url={incomingBanner.avatarUrl}
            size="w-10 h-10"
          />
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-300 truncate">
                {incomingBanner.name}
              </span>
              <span className="text-[9px] font-bold uppercase text-emerald-400">Новое</span>
            </div>
            <p className="text-xs text-gray-200 truncate">{incomingBanner.text}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIncomingBanner(null);
            }}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white border border-gray-700 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-modal-pop">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toast}</span>
        </div>
      )}

      {/* --- ONE-TIME ENTRY ANNOUNCEMENT POPUP --- */}
      {activeAnnouncementToShow && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-modal-pop">
            {/* Main Cover Image at the top */}
            {activeAnnouncementToShow.mainImage && (
              <div className="relative w-full h-52 sm:h-64 bg-black flex-shrink-0 overflow-hidden">
                <img
                  src={activeAnnouncementToShow.mainImage}
                  alt={activeAnnouncementToShow.title}
                  onClick={() => setLightboxImage(activeAnnouncementToShow.mainImage)}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-amber-500/40 text-amber-400 text-[10px] font-extrabold flex items-center space-x-1">
                  <Megaphone className="w-3 h-3" />
                  <span>Важное объявление</span>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreatorBadge />
                  <span className="text-[11px] text-gray-400 font-mono">
                    @{activeAnnouncementToShow.authorUsername || 'b1rl'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {formatTime(activeAnnouncementToShow.createdAt)}
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {activeAnnouncementToShow.title}
                </h2>
                {activeAnnouncementToShow.text && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {activeAnnouncementToShow.text}
                  </p>
                )}
              </div>

              {/* Extra Gallery Images */}
              {activeAnnouncementToShow.extraImages &&
                activeAnnouncementToShow.extraImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {activeAnnouncementToShow.extraImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setLightboxImage(imgUrl)}
                        className="h-28 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 cursor-pointer group relative"
                      >
                        <img
                          src={imgUrl}
                          alt={`Доп. фото ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                    ))}
                  </div>
                )}

              <button
                type="button"
                onClick={() => handleDismissAnnouncement(activeAnnouncementToShow.id)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold shadow-lg transition"
              >
                Понятно, закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Ringing Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-modal-pop">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
              <PhoneCall className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {incomingCall.type === 'video' ? 'Входящий видеозвонок' : 'Входящий аудиозвонок'}
              </span>
              <h3 className="text-lg font-extrabold">{incomingCall.callerName}</h3>
              <p className="text-xs text-gray-400">@{incomingCall.callerUsername}</p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={rejectIncomingCall}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Отклонить</span>
              </button>
              <button
                type="button"
                onClick={acceptIncomingCall}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg"
              >
                <Phone className="w-4 h-4" />
                <span>Принять</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Overlay */}
      {activeCall && (() => {
        const callPartner = allUsers.find((u) => u.uid === activeCall.partnerUid);
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        return (
          <div className="fixed inset-0 bg-gray-950/95 z-50 flex flex-col items-center justify-between p-6">
            <div className="text-center space-y-1 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {activeCall.type === 'video' ? 'Видеозвонок • Круг' : 'Аудиозвонок • Круг'}
              </span>
              <h3 className="text-xl font-extrabold flex items-center justify-center space-x-2">
                <span>{callPartner?.name || 'Собеседник'}</span>
                {callPartner && isCreatorUsername(callPartner.username) && <CreatorBadge compact />}
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {activeCall.status === 'connected' ? `${mins}:${secs}` : 'Вызов...'}
              </p>
            </div>

            <div className="flex-1 w-full max-w-2xl flex items-center justify-center relative my-4">
              {activeCall.type === 'video' ? (
                <div className="w-full h-full max-h-[60vh] bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 relative flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-28 h-40 object-cover rounded-2xl border-2 border-indigo-500 absolute bottom-4 right-4 bg-black shadow-xl"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <audio ref={remoteVideoRef} autoPlay />
                  <div className="p-2 rounded-full bg-indigo-500/20 animate-pulse">
                    <Avatar
                      name={callPartner?.name || 'К'}
                      color={callPartner?.avatarColor}
                      emoji={callPartner?.avatarEmoji}
                      url={callPartner?.avatarUrl}
                      size="w-28 h-28"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 pb-8">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-4 rounded-2xl transition ${
                  isMicMuted ? 'bg-rose-600 text-white' : 'bg-gray-800 text-white'
                }`}
              >
                {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              {activeCall.type === 'video' && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-4 rounded-2xl transition ${
                    isCamOff ? 'bg-rose-600 text-white' : 'bg-gray-800 text-white'
                  }`}
                >
                  {isCamOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}
              <button
                type="button"
                onClick={endActiveCall}
                className="px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-2 shadow-xl"
              >
                <PhoneOff className="w-6 h-6" />
                <span>Завершить</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage('')}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Превью"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            />
            <div className="flex justify-center space-x-3 mt-3">
              <a
                href={lightboxImage}
                download="krug.jpg"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Скачать</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage('')}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-bold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Creator Modal */}
      {isStoryCreatorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handlePublishStory}
            className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-modal-pop"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Camera className="w-5 h-5 text-indigo-500" />
                <span>Новая сторис (24ч)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsStoryCreatorOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div
                onClick={() => storyFileInputRef.current?.click()}
                className="w-full h-48 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-gray-50 dark:bg-gray-800/50"
              >
                {storyImage ? (
                  <img src={storyImage} alt="Превью" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-2 p-4">
                    <ImageIcon className="w-6 h-6 text-indigo-500 mx-auto" />
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      Нажмите, чтобы выбрать фото
                    </span>
                  </div>
                )}
                <input
                  ref={storyFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleStoryImageSelect}
                />
              </div>

              <input
                type="text"
                placeholder="Подпись к сторис..."
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none"
              />

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 block">Видимость:</label>
                {isAdmin ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStoryVisibility('friends')}
                      className={`p-2.5 rounded-2xl border text-left text-xs font-bold ${
                        storyVisibility === 'friends'
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400'
                          : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-400'
                      }`}
                    >
                      Только друзья
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoryVisibility('all')}
                      className={`p-2.5 rounded-2xl border text-left text-xs font-bold ${
                        storyVisibility === 'all'
                          ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-400'
                      }`}
                    >
                      Все пользователи
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-xs text-indigo-400 font-semibold">
                    Сторис для всех может выкладывать только создатель (@b1rl). У вас: Только друзья.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={storySubmitting || (!storyImage && !storyCaption.trim())}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg disabled:opacity-50"
              >
                {storySubmitting ? 'Публикация...' : 'Опубликовать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Story Modal */}
      {viewingStoryGroup && (
        <div
          onClick={() => setViewingStoryGroup(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-modal-pop"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Avatar
                  name={viewingStoryGroup.owner.name}
                  color={viewingStoryGroup.owner.avatarColor}
                  emoji={viewingStoryGroup.owner.avatarEmoji}
                  url={viewingStoryGroup.owner.avatarUrl}
                  size="w-9 h-9"
                />
                <div>
                  <h4 className="text-xs font-extrabold flex items-center space-x-1.5">
                    <span>{viewingStoryGroup.owner.name}</span>
                    {isCreatorUsername(viewingStoryGroup.owner.username) && <CreatorBadge compact />}
                  </h4>
                  <span className="text-[10px] text-gray-400">@{viewingStoryGroup.owner.username}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStoryGroup(null)}
                className="p-1.5 rounded-xl hover:bg-gray-800"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {viewingStoryGroup.stories[0]?.imageUrl && (
              <div className="w-full h-72 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                <img
                  src={viewingStoryGroup.stories[0].imageUrl}
                  alt="Сторис"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {viewingStoryGroup.stories[0]?.caption && (
              <p className="text-xs font-medium text-gray-200 text-center px-2">
                {viewingStoryGroup.stories[0].caption}
              </p>
            )}

            {viewingStoryGroup.owner.uid === activeUserUid && (
              <button
                type="button"
                onClick={() => handleDeleteStory(viewingStoryGroup.stories[0].id)}
                className="w-full py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить эту сторис</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProfile}
            className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-modal-pop"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                <span>Настройки профиля</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-4 py-2">
              <Avatar
                name={editName || '?'}
                color={editAvatarColor}
                emoji={editAvatarEmoji}
                url={editAvatarUrl}
                size="w-16 h-16"
              />
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-sm font-extrabold">{editName}</h4>
                  {isAdmin && <CreatorBadge compact />}
                </div>
                <p className="text-xs text-indigo-400 font-mono">@{editUsername}</p>
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="text-[11px] font-bold text-indigo-500 hover:underline block"
                >
                  Загрузить фото
                </button>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAvatarUpload(e, 'edit')}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Имя</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                  @username
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Телефон</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">О себе</label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                  Новый пароль (оставьте пустым, если не нужно менять)
                </label>
                <input
                  type="password"
                  placeholder="Минимум 4 символа"
                  value={newProfilePassword}
                  onChange={(e) => setNewProfilePassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 block">Цвет аватара</label>
                <div className="flex space-x-1.5 overflow-x-auto pb-1">
                  {AVATAR_GRADIENTS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { setEditAvatarColor(g); setEditAvatarUrl(''); }}
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${g} ring-2 ${
                        editAvatarColor === g && !editAvatarUrl ? 'ring-indigo-500' : 'ring-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
            >
              {profileSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>
      )}

      {/* Admin Panel Modal (Strictly for @b1rl) */}
      {isAdminModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-gray-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-gray-100 animate-modal-pop">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center space-x-2 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <span>Админка создателя (@b1rl)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-800"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Admin Sub-Navigation Tabs */}
            <div className="flex bg-gray-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setAdminTab('punishments')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  adminTab === 'punishments'
                    ? 'bg-amber-500 text-gray-950 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Наказания</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('announcements')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  adminTab === 'announcements'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Разовые объявления</span>
              </button>
            </div>

            {adminTab === 'punishments' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                    Выберите пользователя
                  </label>
                  <select
                    value={selectedPunishUid}
                    onChange={(e) => setSelectedPunishUid(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none"
                  >
                    <option value="">-- Выберите аккаунт --</option>
                    {allUsers
                      .filter((u) => u.uid !== activeUserUid)
                      .map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.name} (@{u.username}) {u.punishment?.isBanned ? '[В БАНЕ]' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                    Причина наказания
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Спам или оскорбления"
                    value={punishReason}
                    onChange={(e) => setPunishReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => executeAdminAction('mute')}
                    className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold hover:bg-amber-500/30"
                  >
                    Выдать мут
                  </button>
                  <button
                    type="button"
                    onClick={() => executeAdminAction('warn')}
                    className="py-2.5 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold hover:bg-orange-500/30"
                  >
                    Варн (+1/3)
                  </button>
                  <button
                    type="button"
                    onClick={() => executeAdminAction('ban')}
                    className="py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 text-xs font-bold hover:bg-rose-600/30"
                  >
                    Забанить
                  </button>
                  <button
                    type="button"
                    onClick={() => executeAdminAction('pardon')}
                    className="py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30"
                  >
                    Помиловать
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <h4 className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center space-x-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Журнал действий создателя</span>
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {adminLogs.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">Журнал пуст</p>
                    ) : (
                      adminLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-xs space-y-0.5"
                        >
                          <div className="flex justify-between font-bold text-amber-400">
                            <span>@{log.targetUsername}</span>
                            <span className="text-[10px] text-gray-400">{formatTime(log.createdAt)}</span>
                          </div>
                          <p className="text-gray-200 font-semibold">{log.action}</p>
                          <p className="text-[11px] text-gray-400">Причина: {log.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* --- ONE-TIME ANNOUNCEMENTS CREATOR TAB --- */
              <div className="space-y-4">
                <form onSubmit={handlePublishAnnouncement} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                      Главная картинка в начале объявления
                    </label>
                    <div
                      onClick={() => annMainFileRef.current?.click()}
                      className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-700 hover:border-indigo-500 bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
                    >
                      {annMainImage ? (
                        <>
                          <img
                            src={annMainImage}
                            alt="Главная картинка"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnnMainImage('');
                            }}
                            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                          >
                            Убрать
                          </button>
                        </>
                      ) : (
                        <div className="text-center space-y-1">
                          <ImageIcon className="w-6 h-6 text-indigo-400 mx-auto" />
                          <span className="text-xs font-bold text-gray-300 block">
                            Загрузить главную обложку
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Будет показана крупно сверху окна
                          </span>
                        </div>
                      )}
                      <input
                        ref={annMainFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAnnMainImageSelect}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                      Заголовок объявления
                    </label>
                    <input
                      type="text"
                      placeholder="Например: Обновление мессенджера Круг 2.0!"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                      Текст объявления
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Расскажите друзьям о новостях или правилах..."
                      value={annText}
                      onChange={(e) => setAnnText(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-xs outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase text-gray-400">
                        Дополнительные картинки (до 4 шт.)
                      </label>
                      {annExtraImages.length < 4 && (
                        <button
                          type="button"
                          onClick={() => annExtraFileRef.current?.click()}
                          className="text-[11px] font-bold text-indigo-400 hover:underline flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Добавить фото</span>
                        </button>
                      )}
                      <input
                        ref={annExtraFileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleAnnExtraImagesSelect}
                      />
                    </div>

                    {annExtraImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {annExtraImages.map((img, i) => (
                          <div key={i} className="relative h-16 rounded-xl overflow-hidden border border-gray-700">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setAnnExtraImages((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={annPublishing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold shadow-lg disabled:opacity-50"
                  >
                    {annPublishing ? 'Публикация...' : 'Опубликовать разовое объявление'}
                  </button>
                </form>

                {/* Published Announcements List */}
                <div className="pt-3 border-t border-gray-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-gray-400">
                    Активные объявления ({allAnnouncements.length})
                  </h4>
                  {allAnnouncements.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-3">
                      Нет опубликованных объявлений
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {allAnnouncements.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-2.5 rounded-2xl bg-gray-800/70 border border-gray-700 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            {ann.mainImage && (
                              <img
                                src={ann.mainImage}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                              />
                            )}
                            <div className="overflow-hidden">
                              <h5 className="text-xs font-bold truncate">{ann.title}</h5>
                              <p className="text-[10px] text-gray-400 truncate">{ann.text}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="p-2 rounded-xl hover:bg-rose-500/20 text-rose-400 flex-shrink-0"
                            title="Удалить объявление"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search / Add Friend Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Search className="w-5 h-5 text-indigo-500" />
                <span>Поиск друзей</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Введите @username или телефон..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none"
            />

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchedUsers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Пользователи не найдены</p>
              ) : (
                searchedUsers.map((u) => {
                  const isMe = u.uid === activeUserUid;
                  const isAlreadyFriend = myFriendUids.includes(u.uid);
                  const hasPending = allRequests.some(
                    (r) =>
                      r.status === 'pending' &&
                      ((r.fromUid === activeUserUid && r.toUid === u.uid) ||
                        (r.fromUid === u.uid && r.toUid === activeUserUid))
                  );

                  return (
                    <div
                      key={u.uid}
                      className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar
                          name={u.name}
                          color={u.avatarColor}
                          emoji={u.avatarEmoji}
                          url={u.avatarUrl}
                          size="w-10 h-10"
                        />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-extrabold">{u.name}</h4>
                            {isCreatorUsername(u.username) && <CreatorBadge compact />}
                          </div>
                          <span className="text-[11px] text-indigo-400 font-mono">@{u.username}</span>
                        </div>
                      </div>

                      <div>
                        {isMe ? (
                          <span className="text-[10px] font-bold text-gray-400 px-2.5 py-1 bg-gray-200 dark:bg-gray-700 rounded-xl">
                            Вы
                          </span>
                        ) : isAlreadyFriend ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePartnerUid(u.uid);
                              setMobileView('chat');
                              setIsSearchModalOpen(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold"
                          >
                            Чат
                          </button>
                        ) : hasPending ? (
                          <span className="text-[10px] font-bold text-amber-500 px-2 py-1">
                            Заявка
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sendFriendRequest(u)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center space-x-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Добавить</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Friend Inspect Modal */}
      {inspectUser && (
        <div
          onClick={() => setInspectUser(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-modal-pop"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Avatar
                name={inspectUser.name}
                color={inspectUser.avatarColor}
                emoji={inspectUser.avatarEmoji}
                url={inspectUser.avatarUrl}
                size="w-20 h-20"
              />
              <h3 className="text-base font-extrabold flex items-center space-x-1.5">
                <span>{inspectUser.name}</span>
                {isCreatorUsername(inspectUser.username) && <CreatorBadge compact />}
              </h3>
              <span className="text-xs text-indigo-400 font-mono">@{inspectUser.username}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {inspectUser.bio || 'В приватном круге'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setInspectUser(null);
                  startCall(inspectUser, 'audio');
                }}
                className="py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>Звонок</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectUser(null);
                  startCall(inspectUser, 'video');
                }}
                className="py-2.5 rounded-2xl bg-purple-600 text-white text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Video className="w-4 h-4" />
                <span>Видео</span>
              </button>
            </div>

            {isAdmin && inspectUser.uid !== activeUserUid && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPunishUid(inspectUser.uid);
                  setInspectUser(null);
                  setIsAdminModalOpen(true);
                }}
                className="w-full py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Наказать в админке</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- MAIN APP INTERFACE --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <div
          className={`${
            mobileView === 'chat' ? 'hidden sm:flex' : 'flex'
          } w-full sm:w-80 md:w-96 border-r border-gray-200 dark:border-gray-800 flex-col bg-white dark:bg-gray-900 flex-shrink-0`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div
              onClick={openProfileModal}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <Avatar
                name={currentUserProfile.name}
                color={currentUserProfile.avatarColor}
                emoji={currentUserProfile.avatarEmoji}
                url={currentUserProfile.avatarUrl}
                size="w-11 h-11"
                showStatus
                isOnline={true}
              />
              <div className="overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-extrabold truncate group-hover:text-indigo-400 transition">
                    {currentUserProfile.name}
                  </h3>
                  {isAdmin && <CreatorBadge compact />}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                  @{currentUserProfile.username}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                title="Сменить тему"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  className="p-2 rounded-xl bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                  title="Админка (@b1rl)"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl hover:bg-rose-500/20 text-rose-500"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stories Strip */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-3 overflow-x-auto pb-1">
              {/* Add Story Button */}
              <div
                onClick={() => setIsStoryCreatorOpen(true)}
                className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 group"
              >
                <div className="w-13 h-13 rounded-2xl border-2 border-dashed border-indigo-500 flex items-center justify-center text-indigo-500 bg-indigo-500/10 group-hover:scale-105 transition">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-gray-500">Ваша сторис</span>
              </div>

              {/* Story Groups */}
              {storyGroups.map((group) => (
                <div
                  key={group.owner.uid}
                  onClick={() => setViewingStoryGroup(group)}
                  className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 group"
                >
                  <div className="w-13 h-13 rounded-2xl p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 group-hover:scale-105 transition">
                    <Avatar
                      name={group.owner.name}
                      color={group.owner.avatarColor}
                      emoji={group.owner.avatarEmoji}
                      url={group.owner.avatarUrl}
                      size="w-full h-full"
                    />
                  </div>
                  <span className="text-[10px] font-bold truncate w-14 text-center">
                    {group.owner.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full">
              <button
                type="button"
                onClick={() => setSidebarTab('chats')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  sidebarTab === 'chats'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Чаты ({myFriends.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('friends')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  sidebarTab === 'friends'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Друзья
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('requests')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition relative ${
                  sidebarTab === 'requests'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Заявки
                {incomingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {incomingRequests.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="ml-2 p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow"
              title="Найти друзей"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {sidebarTab === 'chats' && (
              <>
                {/* Saved Messages */}
                <div
                  onClick={() => {
                    setActivePartnerUid(activeUserUid);
                    setMobileView('chat');
                  }}
                  className={`p-3 rounded-2xl cursor-pointer flex items-center space-x-3 transition ${
                    activePartnerUid === activeUserUid
                      ? 'bg-indigo-600/15 border border-indigo-500/40'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-extrabold">
                    🔖
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-xs font-extrabold">Избранное</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      Сохраненные заметки
                    </p>
                  </div>
                </div>

                {myFriends.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Users className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-400">У вас пока нет друзей в круге</p>
                    <button
                      type="button"
                      onClick={() => setIsSearchModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                    >
                      Найти друзей
                    </button>
                  </div>
                ) : (
                  myFriends.map((friend) => {
                    const unread = unreadCounts[friend.uid] || 0;
                    const isActive = activePartnerUid === friend.uid;
                    const friendOnline = isUserReallyOnline(friend);
                    return (
                      <div
                        key={friend.uid}
                        onClick={() => {
                          setActivePartnerUid(friend.uid);
                          setMobileView('chat');
                        }}
                        className={`p-3 rounded-2xl cursor-pointer flex items-center justify-between transition-all duration-200 active:scale-[0.98] ${
                          isActive
                            ? 'bg-indigo-600/15 border border-indigo-500/40 shadow-sm'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <Avatar
                            name={friend.name}
                            color={friend.avatarColor}
                            emoji={friend.avatarEmoji}
                            url={friend.avatarUrl}
                            size="w-11 h-11"
                            showStatus
                            isOnline={friendOnline}
                          />
                          <div className="overflow-hidden">
                            <div className="flex items-center space-x-1.5">
                              <h4 className="text-xs font-extrabold truncate">{friend.name}</h4>
                              {isCreatorUsername(friend.username) && <CreatorBadge compact />}
                            </div>
                            <p
                              className={`text-[11px] truncate ${
                                friendOnline
                                  ? 'text-emerald-500 font-semibold'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {formatLastSeen(friend)}
                            </p>
                          </div>
                        </div>

                        {unread > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-md animate-bounce">
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {sidebarTab === 'friends' && (
              <div className="space-y-2">
                {myFriends.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Список друзей пуст</p>
                ) : (
                  myFriends.map((friend) => (
                    <div
                      key={friend.uid}
                      className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 flex items-center justify-between"
                    >
                      <div
                        onClick={() => setInspectUser(friend)}
                        className="flex items-center space-x-3 cursor-pointer flex-1 overflow-hidden"
                      >
                        <Avatar
                          name={friend.name}
                          color={friend.avatarColor}
                          emoji={friend.avatarEmoji}
                          url={friend.avatarUrl}
                          size="w-10 h-10"
                        />
                        <div className="overflow-hidden">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-extrabold truncate">{friend.name}</h4>
                            {isCreatorUsername(friend.username) && <CreatorBadge compact />}
                          </div>
                          <span className="text-[11px] text-indigo-400 font-mono">@{friend.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePartnerUid(friend.uid);
                            setMobileView('chat');
                          }}
                          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                          title="Открыть чат"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFriend(friend.uid)}
                          className="p-2 rounded-xl hover:bg-rose-500/20 text-rose-500"
                          title="Удалить из друзей"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {sidebarTab === 'requests' && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-2 px-1">
                    Входящие заявки ({incomingRequests.length})
                  </h4>
                  {incomingRequests.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Нет новых заявок</p>
                  ) : (
                    incomingRequests.map((req) => {
                      const sender = allUsers.find((u) => u.uid === req.fromUid);
                      if (!sender) return null;
                      return (
                        <div
                          key={req.id}
                          className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 space-y-2.5"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar
                              name={sender.name}
                              color={sender.avatarColor}
                              emoji={sender.avatarEmoji}
                              url={sender.avatarUrl}
                              size="w-9 h-9"
                            />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <h4 className="text-xs font-extrabold">{sender.name}</h4>
                                {isCreatorUsername(sender.username) && <CreatorBadge compact />}
                              </div>
                              <span className="text-[11px] text-indigo-400 font-mono">@{sender.username}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => respondFriendRequest(req.id, false)}
                              className="flex-1 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300"
                            >
                              Отклонить
                            </button>
                            <button
                              type="button"
                              onClick={() => respondFriendRequest(req.id, true)}
                              className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow"
                            >
                              Принять
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CHAT AREA */}
        <div
          key={activePartnerUid || 'empty-chat'}
          className={`${
            mobileView === 'list' ? 'hidden sm:flex' : 'flex'
          } flex-1 flex-col bg-gray-50 dark:bg-gray-950 relative animate-chat-switch`}
        >
          {activePartnerUid ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileView('list');
                      setActivePartnerUid('');
                    }}
                    className="sm:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div
                    onClick={() => !isSavedMessages && setInspectUser(activePartner)}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    {isSavedMessages ? (
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-extrabold">
                        🔖
                      </div>
                    ) : (
                      <Avatar
                        name={activePartner?.name}
                        color={activePartner?.avatarColor}
                        emoji={activePartner?.avatarEmoji}
                        url={activePartner?.avatarUrl}
                        size="w-11 h-11"
                        showStatus
                        isOnline={isUserReallyOnline(activePartner)}
                      />
                    )}
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-extrabold">
                          {isSavedMessages ? 'Избранное' : activePartner?.name}
                        </h4>
                        {!isSavedMessages &&
                          activePartner &&
                          isCreatorUsername(activePartner.username) && <CreatorBadge compact />}
                      </div>
                      <p
                        className={`text-[11px] font-medium ${
                          isSavedMessages
                            ? 'text-gray-500 dark:text-gray-400'
                            : isUserReallyOnline(activePartner)
                            ? 'text-emerald-500 font-semibold'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {isSavedMessages
                          ? 'Ваши заметки'
                          : `@${activePartner?.username} • ${formatLastSeen(activePartner)}`}
                      </p>
                    </div>
                  </div>
                </div>

                {!isSavedMessages && activePartner && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => startCall(activePartner, 'audio')}
                      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-500"
                      title="Аудиозвонок"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startCall(activePartner, 'video')}
                      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-purple-500"
                      title="Видеозвонок"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 sm:pb-20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-2 text-center">
                    <MessageSquare className="w-10 h-10 text-gray-400" />
                    <p className="text-xs text-gray-400">Здесь пока нет сообщений. Напишите первыми!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderUid === activeUserUid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? 'items-end animate-msg-mine' : 'items-start animate-msg-theirs'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-[65%] rounded-3xl p-3.5 shadow-sm space-y-2 relative group transition-transform duration-150 ${
                            isMine
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          {msg.replyTo && (
                            <div
                              className={`p-2 rounded-xl text-xs border-l-2 ${
                                isMine
                                  ? 'bg-indigo-700/60 border-white text-white/90'
                                  : 'bg-gray-100 dark:bg-gray-800 border-indigo-500 text-gray-600 dark:text-gray-300'
                              }`}
                            >
                              <span className="font-bold block text-[10px]">{msg.replyTo.senderName}</span>
                              <p className="truncate">{msg.replyTo.text}</p>
                            </div>
                          )}

                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Вложение"
                              onClick={() => setLightboxImage(msg.imageUrl)}
                              className="max-h-60 rounded-2xl object-cover cursor-pointer hover:opacity-95 transition"
                            />
                          )}

                          {msg.text && <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

                          <div className="flex items-center justify-end space-x-1.5 text-[10px] opacity-80 pt-0.5">
                            {msg.editedAt && <span>(ред.)</span>}
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMine && (
                              <span
                                className={`font-extrabold ${
                                  msg.isRead ? 'text-sky-300' : 'text-white/60'
                                }`}
                                title={msg.isRead ? 'Прочитано' : 'Отправлено'}
                              >
                                {msg.isRead ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>

                          {/* Message Action Buttons on Hover */}
                          <div className="absolute top-2 right-2 hidden group-hover:flex items-center space-x-1 bg-black/40 backdrop-blur-sm rounded-xl p-1 text-white">
                            <button
                              type="button"
                              onClick={() => setReplyToMsg(msg)}
                              className="p-1 hover:bg-white/20 rounded-lg"
                              title="Ответить"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenReactionMsgId(openReactionMsgId === msg.id ? null : msg.id)
                              }
                              className="p-1 hover:bg-white/20 rounded-lg"
                              title="Реакция"
                            >
                              <Smile className="w-3 h-3" />
                            </button>
                            {isMine && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMsg(msg);
                                    setMessageInput(msg.text || '');
                                  }}
                                  className="p-1 hover:bg-white/20 rounded-lg"
                                  title="Редактировать"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 hover:bg-rose-500/50 rounded-lg"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Quick Reactions Picker Popup */}
                          {openReactionMsgId === msg.id && (
                            <div className="absolute bottom-full mb-2 right-0 bg-gray-900 border border-gray-700 p-1.5 rounded-2xl shadow-2xl flex space-x-1 z-20">
                              {QUICK_REACTIONS.map((em) => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => toggleReaction(msg, em)}
                                  className="w-7 h-7 rounded-xl hover:bg-gray-800 flex items-center justify-center text-sm"
                                >
                                  {em}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reactions render */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div
                            className={`flex flex-wrap gap-1 mt-1 ${
                              isMine ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {Object.entries(msg.reactions).map(([emoji, uids]) => {
                              const reactedByMe = uids.includes(activeUserUid);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => toggleReaction(msg, emoji)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
                                    reactedByMe
                                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span>{uids.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Composer (Raised above Netlify badge & touch safe) */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 space-y-2 pb-16 sm:pb-14 z-20 shadow-xl">
                {replyToMsg && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <Reply className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="font-bold">Ответ для {replyToMsg.senderName}:</span>
                      <span className="truncate text-gray-500">{replyToMsg.text}</span>
                    </div>
                    <button type="button" onClick={() => setReplyToMsg(null)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {editingMsg && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-400">
                    <span>Редактирование сообщения</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMsg(null);
                        setMessageInput('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {pendingImage && (
                  <div className="relative inline-block">
                    <img
                      src={pendingImage}
                      alt="Превью"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPendingImage('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => chatImageInputRef.current?.click()}
                    className="p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    title="Прикрепить картинку"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    ref={chatImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChatImageSelect}
                  />

                  <input
                    type="text"
                    placeholder="Написать сообщение..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs outline-none border border-transparent focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={!messageInput.trim() && !pendingImage}
                    className="p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold">Выберите чат</h3>
              <p className="text-xs text-gray-400 max-w-xs">
                Выберите друга из списка слева или найдите нового по @username или номеру телефона
              </p>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold shadow"
              >
                Найти друзей
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}