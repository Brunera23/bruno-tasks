import { Page } from '@playwright/test';

/**
 * Mock do SDK do Firebase (compat) servido no lugar dos scripts do gstatic.
 * O estado vive no sessionStorage para sobreviver ao reload que o app dispara
 * quando detecta troca de conta Google.
 */
export const FIREBASE_MOCK = `
if(!window.firebase){
  var ss=window.sessionStorage;
  var readJSON=function(k,def){try{var v=ss.getItem(k);return v?JSON.parse(v):def}catch(e){return def}};
  var writeJSON=function(k,v){try{ss.setItem(k,JSON.stringify(v))}catch(e){}};

  var M={
    providerParams:null,
    redirectCalls:0,
    popupError:readJSON('__mockPopupError',null),
    snapshots:{}
  };
  Object.defineProperty(M,'store',{
    get:function(){return readJSON('__mockStore',{})},
    set:function(v){writeJSON('__mockStore',v)}
  });

  var getDoc=function(c,d){var s=M.store;return (s[c]&&s[c][d])||null};
  var snapOf=function(c,d){var v=getDoc(c,d);return {exists:!!v,data:function(){return v||{}}}};
  var setDoc=function(c,d,data,opts){
    var s=M.store;
    s[c]=s[c]||{};
    s[c][d]=(opts&&opts.merge&&s[c][d])?Object.assign({},s[c][d],data):data;
    M.store=s;
    var key=c+'/'+d;
    (M.snapshots[key]||[]).forEach(function(cb){cb(snapOf(c,d))});
  };
  var delDoc=function(c,d){var s=M.store;if(s[c])delete s[c][d];M.store=s};

  // Simula a persistência offline do Firestore: o set() grava local mas a
  // promise só assentaria quando o servidor confirmasse — offline, nunca.
  var hangWrites=readJSON('__mockHangWrites',false);
  // Latencia de gravacao: o Firestore real nao confirma na hora
  var writeDelay=readJSON('__mockWriteDelay',0);
  // Servidor recusando gravacoes (regra de seguranca, chave invalida...)
  var failWrites=readJSON('__mockFailWrites',false);
  var docRef=function(c,d){
    return {
      get:function(){return Promise.resolve(snapOf(c,d))},
      set:function(data,opts){
        if(hangWrites)return new Promise(function(){});
        if(failWrites&&c==='users'){var err=new Error('Missing or insufficient permissions.');err.code='permission-denied';return Promise.reject(err)}
        if(writeDelay)return new Promise(function(res){setTimeout(function(){setDoc(c,d,data,opts);res()},writeDelay)});
        setDoc(c,d,data,opts);return Promise.resolve();
      },
      update:function(data){setDoc(c,d,data,{merge:true});return Promise.resolve()},
      delete:function(){delDoc(c,d);return Promise.resolve()},
      onSnapshot:function(cb){
        var key=c+'/'+d;
        M.snapshots[key]=M.snapshots[key]||[];
        M.snapshots[key].push(cb);
        setTimeout(function(){cb(snapOf(c,d))},10);
        return function(){M.snapshots[key]=(M.snapshots[key]||[]).filter(function(f){return f!==cb})};
      }
    };
  };

  var authCb=null;
  var currentMockUser=function(){return readJSON('__mockUser',null)};
  // Simula a sessão do Google mudando de conta com o app já aberto
  M.setUser=function(u){writeJSON('__mockUser',u);if(authCb)authCb(u)};

  window.firebase={
    initializeApp:function(){},
    firestore:function(){return {
      enablePersistence:function(){return Promise.resolve()},
      collection:function(c){return {
        doc:function(d){return docRef(c,d)},
        add:function(data){setDoc(c,'auto-'+Math.random().toString(36).slice(2),data);return Promise.resolve({})}
      }}
    }},
    auth:function(){return {
      useDeviceLanguage:function(){},
      getRedirectResult:function(){return Promise.resolve({user:null})},
      onAuthStateChanged:function(cb){authCb=cb;setTimeout(function(){cb(currentMockUser())},30);return function(){}},
      signInWithPopup:function(){
        if(M.popupError){var e=new Error('popup falhou');e.code=M.popupError;return Promise.reject(e)}
        var u=readJSON('__mockPendingUser',{uid:'uid-popup',email:'popup@example.com',displayName:'Popup'});
        writeJSON('__mockUser',u);
        if(authCb)authCb(u);
        return Promise.resolve({user:u});
      },
      signInWithRedirect:function(){M.redirectCalls++;window.__mockRedirects=M.redirectCalls;return Promise.resolve()},
      signOut:function(){ss.removeItem('__mockUser');if(authCb)authCb(null);return Promise.resolve()}
    }}
  };
  window.firebase.auth.GoogleAuthProvider=function(){};
  window.firebase.auth.GoogleAuthProvider.prototype.setCustomParameters=function(p){
    M.providerParams=p;window.__mockProviderParams=p;
  };
  window.firebase.firestore.FieldValue={
    serverTimestamp:function(){return Date.now()},
    delete:function(){return null}
  };
  window.__mock=M;
}
`;

export type MockUser = { uid: string; email: string; displayName: string };

export type MockOptions = {
  user?: MockUser | null;
  store?: Record<string, Record<string, any>>;
  localStorage?: Record<string, string>;
  popupError?: string | null;
  pendingUser?: MockUser;
  hangWrites?: boolean;
  writeDelayMs?: number;
  failWrites?: boolean;
};

export async function bootApp(page: Page, opts: MockOptions = {}) {
  await page.route('https://www.gstatic.com/firebasejs/**', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: FIREBASE_MOCK })
  );
  await page.addInitScript((o: MockOptions) => {
    try {
      const s = window.sessionStorage;
      if (s.getItem('__seeded')) return; // não re-semeia depois de um reload
      s.setItem('__seeded', '1');
      if (o.user) s.setItem('__mockUser', JSON.stringify(o.user));
      if (o.pendingUser) s.setItem('__mockPendingUser', JSON.stringify(o.pendingUser));
      if (o.popupError) s.setItem('__mockPopupError', JSON.stringify(o.popupError));
      if (o.hangWrites) s.setItem('__mockHangWrites', JSON.stringify(true));
      if (o.writeDelayMs) s.setItem('__mockWriteDelay', JSON.stringify(o.writeDelayMs));
      if (o.failWrites) s.setItem('__mockFailWrites', JSON.stringify(true));
      s.setItem('__mockStore', JSON.stringify(o.store || {}));
      Object.entries(o.localStorage || {}).forEach(([k, v]) => window.localStorage.setItem(k, v as string));
    } catch (e) { /* about:blank não tem storage acessível */ }
  }, opts);
  await page.goto('/');
}
