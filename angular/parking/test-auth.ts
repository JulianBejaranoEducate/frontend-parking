import { OAuthProvider } from 'firebase/auth'; const provider = new OAuthProvider('microsoft.com'); console.log(provider.credential.toString());
