# Guide de Test - Page Learning

## 🚀 Démarrage des Serveurs

### 1. Backend (Terminal 1)
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Vérification :**
- Ouvrez http://localhost:8000/docs dans votre navigateur
- Vous devriez voir la documentation Swagger de l'API
- L'endpoint `/api/v1/learn/session/start` doit être visible

### 2. Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```

**Vérification :**
- Ouvrez http://localhost:3000 dans votre navigateur
- Le serveur Next.js doit démarrer sur le port 3000

---

## 🧪 Tests des Fonctionnalités

### Test 1: Accès à la Page Learning

1. **Ouvrez** : http://localhost:3000/learn
2. **Vérifiez** :
   - ✅ La page se charge sans erreur
   - ✅ Le panneau de chat s'affiche à gauche
   - ✅ L'avatar 3D s'affiche au centre
   - ✅ Le tableau virtuel s'affiche à droite

### Test 2: Connexion WebSocket

1. **Ouvrez la console du navigateur** (F12)
2. **Attendez** le message : "Connected to learning session"
3. **Vérifiez** :
   - ✅ Message système : "Connected to teacher! Ready to learn."
   - ✅ Le statut de connexion est vert
   - ✅ Aucune erreur dans la console

### Test 3: Envoi d'un Message

1. **Tapez** une question dans le champ de saisie :
   - Exemple : "What is Python?"
   - Exemple : "Explain recursion"
   - Exemple : "How do loops work?"

2. **Appuyez sur Entrée** ou cliquez sur le bouton Envoyer

3. **Vérifiez** :
   - ✅ Votre message apparaît dans le chat (à droite)
   - ✅ Un indicateur de chargement apparaît
   - ✅ Le professeur répond avec du texte
   - ✅ Des actions apparaissent sur le tableau virtuel

### Test 4: Actions du Tableau

Après avoir reçu une réponse :

1. **Vérifiez le tableau virtuel** (panneau de droite)
2. **Vérifiez** :
   - ✅ Des titres apparaissent (WRITE_TITLE)
   - ✅ Des puces apparaissent (WRITE_BULLET)
   - ✅ Des étapes apparaissent (WRITE_STEP)

### Test 5: Contrôles Audio

1. **Bouton Pause/Resume** (jaune) :
   - ✅ Cliquez pour mettre en pause
   - ✅ Cliquez à nouveau pour reprendre

2. **Bouton Volume** (bleu) :
   - ✅ Cliquez pour activer/désactiver l'audio
   - ✅ L'avatar doit réagir à l'audio

### Test 6: Gestion des Erreurs

1. **Arrêtez le backend** (Ctrl+C dans le terminal backend)
2. **Vérifiez** :
   - ✅ Un message d'erreur apparaît dans le chat
   - ✅ Le statut de connexion devient rouge/jaune
   - ✅ Un message "Disconnected" ou "Reconnecting..." apparaît

3. **Redémarrez le backend**
4. **Vérifiez** :
   - ✅ La reconnexion automatique fonctionne
   - ✅ Le statut redevient vert

---

## 🔍 Vérifications Techniques

### Backend - Endpoints Disponibles

Testez avec curl ou Postman :

```powershell
# Test 1: Créer une session
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/learn/session/start" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"type": "START_LESSON", "lesson_id": "test-lesson"}'

# Réponse attendue :
# {
#   "session_id": "uuid-here",
#   "status": "TEACHING"
# }
```

### Frontend - Console du Navigateur

Ouvrez la console (F12) et vérifiez :

1. **Pas d'erreurs rouges**
2. **Messages de connexion** :
   - "Connecting to WebSocket: ws://localhost:8000/api/v1/learn/ws/..."
   - "WebSocket connected: ..."
   - "Connected to learning session"

3. **Événements reçus** :
   - `teacher_text_delta` : fragments de texte
   - `teacher_text_final` : texte complet
   - `board_action` : actions du tableau

---

## 🐛 Dépannage

### Problème : Le backend ne démarre pas

**Solutions :**
1. Vérifiez que Python 3.10+ est installé
2. Activez l'environnement virtuel : `.\venv\Scripts\activate`
3. Installez les dépendances : `pip install -r requirements.txt`
4. Vérifiez le port 8000 n'est pas utilisé : `netstat -ano | findstr :8000`

### Problème : Le frontend ne démarre pas

**Solutions :**
1. Vérifiez que Node.js 18+ est installé : `node --version`
2. Installez les dépendances : `npm install`
3. Vérifiez le port 3000 n'est pas utilisé : `netstat -ano | findstr :3000`

### Problème : Erreur de connexion WebSocket

**Solutions :**
1. Vérifiez que le backend est démarré sur le port 8000
2. Vérifiez le fichier `.env.local` contient : `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Redémarrez le frontend après modification de `.env.local`
4. Vérifiez les CORS dans le backend (doit autoriser `*`)

### Problème : Pas de réponse du professeur

**Solutions :**
1. Vérifiez les logs du backend pour les erreurs
2. Vérifiez que le service LLM est configuré (Token Factory)
3. Vérifiez la clé API dans `.env` du backend
4. Testez avec un message simple : "Hello"

---

## ✅ Checklist de Test Complet

- [ ] Backend démarre sans erreur
- [ ] Frontend démarre sans erreur
- [ ] Page `/learn` se charge
- [ ] Connexion WebSocket réussie
- [ ] Message système "Connected to teacher!" apparaît
- [ ] Envoi d'un message fonctionne
- [ ] Réponse du professeur reçue
- [ ] Actions du tableau affichées
- [ ] Bouton Pause/Resume fonctionne
- [ ] Bouton Volume fonctionne
- [ ] Avatar 3D s'affiche
- [ ] Gestion des erreurs fonctionne
- [ ] Reconnexion automatique fonctionne

---

## 📝 Notes

- Le backend doit être démarré **avant** le frontend
- Les modifications de `.env.local` nécessitent un redémarrage du frontend
- Les logs du backend montrent les événements WebSocket
- La console du navigateur montre les événements frontend
