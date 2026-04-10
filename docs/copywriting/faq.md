# PM-Chat — Foire aux questions

---

### 1. Qu'est-ce que PM-Chat ?

PM-Chat est un système de messagerie autonome et chiffré. Il repose sur des appareils physiques qui communiquent directement entre eux via radio LoRa, sans Internet, sans Wi-Fi et sans carte SIM. Le système est conçu pour fonctionner de manière totalement indépendante de toute infrastructure réseau externe.

---

### 2. PM-Chat nécessite-t-il une connexion Internet ?

Non. PM-Chat fonctionne sans aucune connexion Internet. Les appareils communiquent directement entre eux par radio LoRa. Aucun serveur distant, aucun service cloud et aucun opérateur télécom n'intervient dans le transport des messages.

---

### 3. Quelle est la portée de communication ?

La portée dépend de l'environnement. En ligne de vue dégagée, la communication peut atteindre plusieurs kilomètres. En zone urbaine ou forestière, la portée est réduite par les obstacles. Le réseau maillé permet d'étendre la portée en relayant les messages via des appareils intermédiaires.

---

### 4. Comment les messages sont-ils chiffrés ?

Chaque message est chiffré avec l'algorithme AES-256-GCM directement sur l'appareil avant toute transmission radio. Un nonce unique est généré par le générateur de nombres aléatoires matériel (TRNG) du microcontrôleur pour chaque message. Les clés de chiffrement sont stockées uniquement sur l'appareil et ne sont jamais transmises par radio.

---

### 5. Les messages peuvent-ils être interceptés ?

Les transmissions radio LoRa peuvent être captées par un récepteur compatible. Cependant, le contenu de chaque message est chiffré avec AES-256-GCM avant transmission. Sans la clé de chiffrement, le contenu intercepté est inexploitable. Le système est conçu pour limiter l'exposition, mais aucun système ne peut garantir une sécurité absolue.

---

### 6. Combien d'appareils peuvent former un réseau maillé ?

Le protocole PM-Chat ne fixe pas de limite théorique stricte au nombre d'appareils dans un réseau. En pratique, la performance du réseau maillé dépend de la densité des appareils, de la fréquence des messages et du TTL configuré. Un réseau de quelques dizaines d'appareils est un scénario courant et bien supporté.

---

### 7. Quelle est l'autonomie de la batterie ?

L'autonomie dépend de l'usage : fréquence des messages envoyés et reçus, activité de relais maillé, et luminosité de l'écran. La batterie LiPo rechargeable est dimensionnée pour un usage prolongé sur le terrain. Les modes basse consommation du microcontrôleur contribuent à optimiser l'autonomie.

---

### 8. Peut-on mettre à jour le firmware ?

Oui. Le firmware peut être mis à jour en connectant l'appareil à un ordinateur et en suivant la procédure de flashage documentée dans PM-Chat Setup. Les binaires firmware sont disponibles en téléchargement sur PM-Chat Online. Chaque mise à jour est accompagnée de notes de version.

---

### 9. Que se passe-t-il si un appareil est compromis ?

Si un appareil est physiquement compromis, les clés stockées sur cet appareil sont potentiellement exposées. L'appareil intègre une fonction d'effacement d'urgence (panic wipe) permettant de supprimer rapidement les clés et les messages. En cas de compromission confirmée, le code réseau doit être changé sur tous les appareils restants.

---

### 10. PM-Chat est-il open source ?

Le code source du firmware est hébergé sur un dépôt accessible. La politique d'ouverture du code est progressive : certaines parties sont publiées, d'autres le seront à mesure que le projet mûrit. Consultez le dépôt pour l'état actuel de la publication.

---

### 11. Comment demander un pilote ?

Rendez-vous sur la page Contact de PM-Chat Online et remplissez le formulaire de demande de pilote. Indiquez votre organisation, le contexte d'utilisation envisagé et le nombre d'appareils souhaité. L'équipe PM-Chat vous recontactera pour évaluer la faisabilité et organiser le pilote.

---

### 12. Qu'est-ce que le relais maillé ?

Le relais maillé (mesh relay) est un mécanisme par lequel les appareils PM-Chat intermédiaires retransmettent automatiquement les messages qu'ils reçoivent. Cela permet d'étendre la portée du réseau au-delà de la communication directe entre deux appareils. Chaque message porte un compteur TTL qui limite le nombre de sauts et un identifiant unique qui empêche les boucles de relais.

---

### 13. PM-Chat peut-il communiquer avec d'autres appareils LoRa ?

Non. PM-Chat utilise un protocole propriétaire et un chiffrement spécifique. Les appareils PM-Chat ne communiquent qu'avec d'autres appareils PM-Chat partageant le même code réseau. L'interopérabilité avec d'autres systèmes LoRa n'est pas prise en charge par conception, afin de maintenir l'intégrité du réseau fermé.

---

### 14. Combien de messages l'appareil peut-il stocker ?

La capacité de stockage dépend de la mémoire flash disponible sur le microcontrôleur. L'appareil conserve un historique local des messages reçus et envoyés. Lorsque la mémoire est pleine, les messages les plus anciens sont remplacés par les nouveaux. Le stockage est local uniquement : aucun message n'est sauvegardé à l'extérieur de l'appareil.

---

### 15. Dans quelle langue est l'interface de l'appareil ?

L'interface de l'appareil est en anglais. La navigation repose sur un écran OLED et trois boutons physiques. L'interface est minimaliste et conçue pour être compréhensible sans documentation détaillée.

---

### 16. Comment fonctionne le provisionnement ?

Le provisionnement consiste à configurer chaque appareil avec un code réseau partagé. Ce code définit le groupe de communication : seuls les appareils partageant le même code peuvent échanger des messages. La procédure est documentée dans les guides PM-Chat Setup et ne nécessite pas de compétences techniques avancées.

---

### 17. PM-Chat fonctionne-t-il en intérieur ?

Oui, mais la portée est significativement réduite en intérieur en raison de l'atténuation du signal par les murs et les structures. Pour un usage principalement en intérieur, il est recommandé de positionner les appareils de manière à maximiser la ligne de vue et d'utiliser le relais maillé pour compenser les pertes de signal.

---

### 18. Quelles bandes de fréquence sont utilisées ?

PM-Chat utilise la bande de fréquence EU868 (863–870 MHz), conformément à la réglementation européenne pour les dispositifs radio à courte portée. Cette bande est utilisable sans licence dans l'Union européenne. L'utilisation dans d'autres régions peut nécessiter une adaptation aux réglementations locales.
