import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider,
    signInWithPopup,
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot, 
    orderBy,
    serverTimestamp,
    getDocs,
    limit,
    doc,
    setDoc
} from 'firebase/firestore';

// --- IMPORTANT: Firebase Configuration ---
// 1. Go to your Firebase project console: https://console.firebase.google.com/
// 2. Go to Project Settings > General.
// 3. Under "Your apps", click the "</>" icon to add a web app if you haven't already.
// 4. Copy the firebaseConfig object here.
const firebaseConfig = {
    apiKey: "AIzaSyDv8GflZDDTNMf7CK5lNkSdUQQlp7A7Jmo",
    authDomain: "mailing-app-5e72c.firebaseapp.com",
    projectId: "mailing-app-5e72c",
    storageBucket: "mailing-app-5e72c.appspot.com",
    messagingSenderId: "301352104868",
    appId: "1:301352104868:web:028f52dd7d659dde5cc731"
};
// --- END of Firebase Configuration ---


// --- VERY IMPORTANT: Setup Instructions ---
// 1. ENABLE GOOGLE SIGN-IN IN FIREBASE:
//    - In your Firebase Console, go to "Authentication".
//    - Click on the "Sign-in method" tab.
//    - Click on "Google" in the provider list, enable it, and save.
//
// 2. AUTHORIZE YOUR DOMAIN:
//    - In the same "Sign-in method" tab, scroll down to "Authorized domains".
//    - Click "Add domain" and enter the domain where you are hosting this app.
//    - If you are testing locally, you might need to add "localhost".
//
// 3. SET FIRESTORE SECURITY RULES:
//    - In your Firebase console, go to "Firestore Database".
//    - Click the "Rules" tab.
//    - Replace the existing rules with the following:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own inbox and sent items
    match /users/{userId}/{folder}/{emailId} {
      allow read, create: if request.auth != null && request.auth.uid == userId;
    }
    // Any authenticated user can look up another user's public info (UID) to send them an email.
    match /user_lookup/{email} {
      allow get: if request.auth != null;
    }
    // Users can create their own lookup document when they sign up.
    match /user_lookup/{email} {
        allow create: if request.auth != null && request.auth.token.email == email;
    }
  }
}
*/
// --- END of Setup Instructions ---

// --- App Initialization ---
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
let app, auth, db;
if (isConfigValid) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
}

// --- SVG Icons ---
const LockIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);
const GoogleIcon = (props) => (
    <svg {...props} viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.986,36.657,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);
const PencilIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const InboxIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;
const PaperAirplaneIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const LogoutIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const ArrowLeftIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;


const SetupIncompleteScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-2xl p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl">
            <div className="text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="mt-4 text-3xl font-bold text-white">
                    Configuration Needed
                </h2>
                <p className="mt-2 text-slate-400">
                    To get started, you need to connect this app to your Firebase project.
                </p>
            </div>
            <div className="text-left text-slate-300 bg-slate-900 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Follow these steps:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to the Firebase Console: <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">console.firebase.google.com</a></li>
                    <li>Select your project (or create a new one).</li>
                    <li>Go to <span className="font-mono bg-slate-700 px-1 rounded">Project Settings</span> (click the gear icon ⚙️).</li>
                    <li>In the "General" tab, scroll down to "Your apps".</li>
                    <li>Click the Web icon <span className="font-mono bg-slate-700 px-1 rounded">&lt;/&gt;</span> to add a web app if you haven't already.</li>
                    <li>Find and copy the <span className="font-mono bg-slate-700 px-1 rounded">firebaseConfig</span> object.</li>
                    <li>
                        Paste it into the <code className="font-mono bg-slate-700 px-1 rounded">SecureMail.jsx</code> file on line 20, replacing the placeholder values.
                    </li>
                </ol>
            </div>
             <div className="mt-4 text-xs text-center text-slate-500">
                The app will automatically work once you update the configuration.
            </div>
        </div>
    </div>
);


// --- Main Application Component ---
export default function App() {
    if (!isConfigValid) {
        return <SetupIncompleteScreen />;
    }

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('inbox'); // inbox, compose, sent, read
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [initialView, setInitialView] = useState('inbox');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if(currentUser) {
                setView('inbox');
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSelectEmail = (email, fromView) => {
        setSelectedEmail(email);
        setInitialView(fromView); // remember where we came from
        setView('read');
    };
    
    const handleComposeSuccess = () => {
        setView('sent');
    }

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <AuthScreen />;
    }

    return (
        <div className="flex h-screen font-sans bg-slate-100 antialiased">
            <Sidebar user={user} setView={setView} activeView={view} />
            <main className="flex-1 flex flex-col bg-white overflow-hidden">
                {view === 'inbox' && <Inbox onSelectEmail={(email) => handleSelectEmail(email, 'inbox')} />}
                {view === 'compose' && <Compose onEmailSent={handleComposeSuccess} />}
                {view === 'sent' && <SentEmails onSelectEmail={(email) => handleSelectEmail(email, 'sent')} />}
                {view === 'read' && <EmailView email={selectedEmail} onBack={() => setView(initialView)} />}
            </main>
        </div>
    );
}

// --- UI & Logic Components ---

const LoadingScreen = () => (
    <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center">
            <LockIcon className="mx-auto h-12 w-12 text-blue-500 animate-pulse" />
            <h1 className="text-2xl font-semibold mt-4">SecureMail</h1>
            <p className="text-slate-400">Initializing Secure Connection...</p>
        </div>
    </div>
);

const AuthScreen = () => {
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Create or update the user lookup document. Using setDoc with the email as the ID is idempotent.
            await setDoc(doc(db, "user_lookup", user.email), {
                uid: user.uid
            });

        } catch (err) {
            if (err.code === 'auth/unauthorized-domain') {
                 setError(`This domain is not authorized. Go to the Firebase console -> Authentication -> Sign-in method -> Authorized domains, and add: ${window.location.hostname}`);
            } else {
                setError('Failed to sign in with Google. Please try again.');
            }
            console.error(err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
            <div className="w-full max-w-sm p-8 space-y-8 bg-slate-800 rounded-2xl shadow-2xl text-center">
                <div className="inline-block p-3 bg-slate-700 rounded-full">
                    <LockIcon className="h-10 w-10 text-blue-400" />
                </div>
                <h2 className="mt-4 text-3xl font-bold text-white">
                    Welcome to SecureMail
                </h2>
                <p className="mt-2 text-slate-400">The simple, modern, and secure way to email.</p>
                <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300"
                >
                    <GoogleIcon className="h-6 w-6" />
                    Sign In with Google
                </button>
                {error && <p className="text-sm text-red-400 pt-4">{error}</p>}
            </div>
        </div>
    );
};

const Sidebar = ({ user, setView, activeView }) => {
    const NavButton = ({ viewName, label, icon }) => (
        <button
            onClick={() => setView(viewName)}
            className={`flex items-center w-full px-4 py-3 text-left transition-colors duration-200 rounded-lg ${
                activeView === viewName
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
        >
            {icon}
            <span className="ml-3 font-medium">{label}</span>
        </button>
    );

    return (
        <aside className="w-64 bg-slate-800 text-white flex flex-col p-4 space-y-4">
            <div className="flex items-center mb-4 px-2">
                <LockIcon className="h-8 w-8 text-blue-400" />
                <h1 className="text-2xl font-bold ml-2">SecureMail</h1>
            </div>
            <button
                onClick={() => setView('compose')}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow-lg"
            >
                <PencilIcon className="h-5 w-5 mr-2" />
                Compose
            </button>
            <nav className="flex flex-col space-y-2 flex-grow">
                <NavButton viewName="inbox" label="Inbox" icon={<InboxIcon className="h-5 w-5" />} />
                <NavButton viewName="sent" label="Sent" icon={<PaperAirplaneIcon className="h-5 w-5" />} />
            </nav>
            <div className="border-t border-slate-700 pt-4">
                <div className="text-sm text-slate-400 mb-2 truncate px-2" title={user.email}>
                    {user.email}
                </div>
                <button
                    onClick={() => signOut(auth)}
                    className="flex items-center w-full px-4 py-3 text-left text-slate-300 transition-colors duration-200 rounded-lg hover:bg-slate-700 hover:text-white"
                >
                    <LogoutIcon className="h-5 w-5" />
                    <span className="ml-3">Logout</span>
                </button>
            </div>
        </aside>
    );
};

const EmailList = ({ emails, onSelectEmail, emptyMessage, type }) => {
    if (emails.length === 0) {
        return <div className="text-center text-slate-500 mt-20">{emptyMessage}</div>;
    }

    return (
        <ul className="divide-y divide-slate-200 overflow-y-auto">
            {emails.map((email) => (
                <li
                    key={email.id}
                    onClick={() => onSelectEmail(email)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                >
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-slate-800 truncate pr-4">{type === 'inbox' ? email.from : email.to}</p>
                        <p className="text-xs text-slate-500 flex-shrink-0">
                           {email.timestamp ? new Date(email.timestamp?.toDate()).toLocaleString() : 'Sending...'}
                        </p>
                    </div>
                    <p className="text-slate-700 font-medium truncate mt-1">{email.subject}</p>
                    <p className="text-sm text-slate-500 truncate mt-1">{email.body}</p>
                </li>
            ))}
        </ul>
    );
};

const Inbox = ({ onSelectEmail }) => {
    const [emails, setEmails] = useState([]);
    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(
            collection(db, `users/${auth.currentUser.uid}/inbox`),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEmails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Inbox</h2>
            </div>
            <EmailList emails={emails} onSelectEmail={onSelectEmail} type="inbox" emptyMessage="Your inbox is empty." />
        </div>
    );
};

const SentEmails = ({ onSelectEmail }) => {
    const [emails, setEmails] = useState([]);
    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(
            collection(db, `users/${auth.currentUser.uid}/sent`),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEmails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Sent</h2>
            </div>
            <EmailList emails={emails} onSelectEmail={onSelectEmail} type="sent" emptyMessage="You haven't sent any emails." />
        </div>
    );
};

const Compose = ({ onEmailSent }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [status, setStatus] = useState({ sending: false, error: '', success: '' });

    const handleSend = async (e) => {
        e.preventDefault();
        setStatus({ sending: true, error: '', success: '' });

        if (!to || !subject || !body) {
            setStatus({ sending: false, error: 'Please fill out all fields.', success: '' });
            return;
        }

        try {
            // Find the recipient's user ID from their email
            const userLookupQuery = query(collection(db, "user_lookup"), where("email", "==", to.toLowerCase()), limit(1));
            const querySnapshot = await getDocs(userLookupQuery);

            if (querySnapshot.empty) {
                throw new Error(`User with email "${to}" not found.`);
            }
            const recipient = querySnapshot.docs[0].data();
            const recipientUid = recipient.uid;
            
            const emailContent = {
                from: auth.currentUser.email,
                to: to.toLowerCase(),
                subject,
                body,
                timestamp: serverTimestamp(),
            };

            // 1. Add to recipient's inbox
            await addDoc(collection(db, `users/${recipientUid}/inbox`), emailContent);
            // 2. Add to sender's sent folder
            await addDoc(collection(db, `users/${auth.currentUser.uid}/sent`), emailContent);

            setStatus({ sending: false, error: '', success: 'Email sent successfully!' });
            setTimeout(() => {
                onEmailSent();
            }, 1000);

        } catch (err) {
            setStatus({ sending: false, error: err.message, success: '' });
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Compose New Email</h2>
            </div>
            <form onSubmit={handleSend} className="p-4 space-y-4 flex-grow flex flex-col">
                <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="To (email address)"
                    className="w-full px-4 py-2 text-slate-800 bg-slate-100 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full px-4 py-2 text-slate-800 bg-slate-100 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Your message..."
                    className="w-full px-4 py-2 text-slate-800 bg-slate-100 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow resize-none"
                    required
                />
                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        disabled={status.sending}
                        className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-400"
                    >
                        {status.sending ? 'Sending...' : 'Send'}
                    </button>
                    {status.error && <p className="text-sm text-red-500">{status.error}</p>}
                    {status.success && <p className="text-sm text-green-500">{status.success}</p>}
                </div>
            </form>
        </div>
    );
};

const EmailView = ({ email, onBack }) => {
    return (
        <div className="flex flex-col h-full p-4 overflow-y-auto">
             <div className="flex items-center mb-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 mr-4">
                   <ArrowLeftIcon className="h-6 w-6 text-slate-600"/>
                </button>
                <h2 className="text-2xl font-bold text-slate-800 truncate">{email.subject}</h2>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                    <div>
                        <p className="font-semibold text-slate-800">{email.from}</p>
                        <p className="text-sm text-slate-500">To: {email.to}</p>
                    </div>
                    <p className="text-sm text-slate-500">
                        {email.timestamp ? new Date(email.timestamp.toDate()).toLocaleString() : ''}
                    </p>
                </div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed pt-2">
                    {email.body}
                </div>
            </div>
        </div>
    );
};

