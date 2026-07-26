import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { syncUserProfileToFirestore, ADMIN_USER_ID } from '../utils/firestoreDb';
import { LogIn, UserPlus, LogOut, ShieldCheck, Mail, Lock, User as UserIcon, X, CheckCircle2, AlertCircle, Sparkles, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name when setting up a new account.');
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (fullName.trim()) {
          await updateProfile(userCred.user, { displayName: fullName.trim() });
        }
        await syncUserProfileToFirestore(userCred.user);
        const isAdmin = userCred.user.uid === ADMIN_USER_ID;
        setSuccessMessage(`Account created successfully! ${isAdmin ? 'Admin Dashboard Access Granted.' : `Welcome, ${fullName.trim() || userCred.user.email}`}`);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfileToFirestore(userCred.user);
        const isAdmin = userCred.user.uid === ADMIN_USER_ID;
        setSuccessMessage(`Welcome back! ${isAdmin ? 'Administrator Access Granted (Admin Dashboard Ready).' : `Signed in as ${userCred.user.displayName || userCred.user.email}`}`);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      let friendlyError = 'Authentication failed. Please check your credentials and try again.';
      const errCode = err?.code || '';
      const errMsg = err?.message || '';

      if (errCode === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
        friendlyError = 'An account with this email address already exists. Please switch to "Sign In" above to log in.';
      } else if (errCode === 'auth/invalid-credential' || errCode === 'auth/wrong-password' || errCode === 'auth/user-not-found' || errMsg.includes('invalid-credential') || errMsg.includes('user-not-found') || errMsg.includes('wrong-password')) {
        friendlyError = 'Invalid email address or password. If you do not have an account yet, please click "Create Account" above.';
      } else if (errCode === 'auth/invalid-email' || errMsg.includes('invalid-email')) {
        friendlyError = 'Please enter a valid email address.';
      } else if (errCode === 'auth/weak-password' || errMsg.includes('weak-password')) {
        friendlyError = 'Password is too weak. Please use a password with at least 6 characters.';
      } else if (errCode === 'auth/too-many-requests' || errMsg.includes('too-many-requests')) {
        friendlyError = 'Access to this account has been temporarily disabled due to many failed attempts. You can try again later.';
      } else if (errMsg && !errMsg.includes('Firebase: Error')) {
        friendlyError = errMsg;
      }
      setErrorMessage(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setSuccessMessage('Successfully signed out.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage('Error signing out.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative overflow-hidden">
        
        {/* Top Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 font-display">
              {currentUser ? 'Firebase User Account' : mode === 'signin' ? 'Sign In to Kemet OS' : 'Register New Account'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentUser 
                ? 'Firebase Email/Password Authentication Session' 
                : mode === 'signin' 
                  ? 'Access operational farm tools with your credentials' 
                  : 'Create a new operator profile with Full Name & Email'}
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs space-y-2">
            <div className="flex items-start space-x-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes('switch to "Sign In"') && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(null); }}
                className="ml-6 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-3xs transition-all cursor-pointer"
              >
                Click here to Switch to Sign In
              </button>
            )}
            {errorMessage.includes('click "Create Account"') && (
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(null); }}
                className="ml-6 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-3xs transition-all cursor-pointer"
              >
                Click here to Register New Account
              </button>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start space-x-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Signed-In View */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200/80 space-y-3 text-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl font-bold font-mono text-sm shrink-0">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <span className="text-2xs font-bold text-emerald-700 uppercase font-mono tracking-wider">Active Session</span>
                  {currentUser.displayName && (
                    <p className="font-bold text-gray-900 text-sm truncate">{currentUser.displayName}</p>
                  )}
                  <p className="text-xs text-gray-600 truncate">{currentUser.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200/60 grid grid-cols-2 gap-2 text-2xs text-gray-500 font-mono">
                <div>
                  <span className="block text-gray-400">Full Name:</span>
                  <span className="font-bold text-gray-700">{currentUser.displayName || 'Not specified'}</span>
                </div>
                <div>
                  <span className="block text-gray-400">User ID:</span>
                  <span className="font-bold text-gray-700 truncate block">{currentUser.uid.slice(0, 10)}...</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-3 rounded-2xl border border-rose-200 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sign Out from Firebase</span>
            </button>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold mb-4">
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(null); }}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  mode === 'signin' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(null); }}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  mode === 'signup' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <UserPlus size={14} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Full Name Field for Sign Up */}
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                  <UserIcon size={13} className="text-emerald-600" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Olufemi Olabode"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all"
                  required
                />
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                <Mail size={13} className="text-emerald-600" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@kemetfarms.org"
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                <Lock size={13} className="text-emerald-600" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all"
                required
              />
            </div>

            {/* Confirm Password Field for Sign Up */}
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                  <Lock size={13} className="text-emerald-600" />
                  <span>Confirm Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3 rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <span>Authenticating with Firebase...</span>
              ) : mode === 'signin' ? (
                <>
                  <LogIn size={15} />
                  <span>Sign In with Email/Password</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Register Account with Email/Password</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

