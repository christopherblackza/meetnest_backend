<!-- Generate Languages -->
flutter gen-l10n 

# Meetro 🌍

**Connect. Explore. Experience.**

Meetro is the ultimate social companion for travelers and locals alike. Whether you're a solo backpacker looking for a dinner buddy, a local wanting to practice a new language, or a group seeking the best underground events in the city, Meetro bridges the gap between digital connection and real-world experiences.

---

## 🚀 What is Meetro?

Meetro is a location-based social networking app designed to foster spontaneous connections and planned meetups. Unlike traditional dating apps or static travel guides, Meetro focuses on **activities** and **intent**. Users share what they are doing *right now* or planning to do, making it easy to find like-minded people to join in.

### Core Philosophy
*   **Spontaneity:** Find people nearby who want to grab coffee, hike, or party *now*.
*   **Safety:** Verified profiles and community-driven trust.
*   **Global & Local:** Seamlessly blends the excitement of travel with the comfort of local knowledge.

---

## ✨ Key Features

### 📍 Nearby Travelers & Locals
Discover people in your immediate vicinity. Filter by interests, languages spoken, or travel dates. See who's currently in your city and who's arriving soon.

### ✈️ Trip Planning
Planning a getaway? Create a **Trip** to let others know when you'll be in their city. Connect with locals and other travelers before you even pack your bags.

### 🎬 Activities Feed
A dynamic, visual feed of what's happening around you.
*   **Post an Activity:** "Heading to the Jazz Bar at 9 PM, who's in?"
*   **Join the Fun:** RSVP to public meetups and events.
*   **Share Moments:** Upload photos and videos of your adventures.

### 💬 Real-Time Chat
Stay connected with instant messaging.
*   **1-on-1 Chat:** Coordinate plans privately.
*   **Group Chats:** Automatically created for Meetups and Activities.
*   **Smart Avatars:** Quickly see a user's country of origin or current status directly from the chat list.

### 🗺️ Interactive Map
Visualize the world around you. Switch to **Map View** to see active meetups, popular hotspots, and friends' locations (with privacy controls) in real-time.

---

## 🛠️ Built With

Meetro is engineered for performance, scalability, and a buttery-smooth user experience using the latest mobile technologies.

*   **Framework:** [Flutter](https://flutter.dev/) (Dart) - For a beautiful, native cross-platform experience.
*   **State Management:** [BLoC / Cubit](https://pub.dev/packages/flutter_bloc) - Ensuring predictable state changes and clean architecture.
*   **Backend Services:**
    *   **Supabase:** For robust authentication, real-time database, and secure storage.
    *   **Firebase:** Leveraging Cloud Messaging (FCM) for notifications and Analytics.
*   **Maps & Location:** Google Maps Platform & Geolocator for precise location-based features.
*   **Media:** Integrated video compression and caching for fast media loading.
*   **Localization:** Fully localized supporting multiple languages (`flutter_gen`).

---

## ❓ Frequently Asked Questions (FAQ)

### For Users

**Q: Is Meetro a dating app?**
A: While you can certainly meet romantic partners on Meetro, it is primarily designed for **platonic connections**, friendships, and activity partners. Our focus is on *doing things together*.

**Q: Can I use Meetro if I'm not traveling?**
A: Absolutely! "Locals" are the heartbeat of Meetro. Use it to meet travelers visiting your city, find language exchange partners, or discover new activities in your own hometown.

---

### For Developers / Contributors

**Q: How do I run the project locally?**
1.  Ensure you have the Flutter SDK installed (`>=3.0.0`).
2.  Clone the repository.
3.  Create a `.env` file in the root with your API keys (Supabase, Google Maps, Paystack).
4.  Run `flutter pub get`.
5.  Generate localization files: `flutter gen-l10n`.
6.  Run `flutter run`.

**Q: What is the architecture pattern?**
A: We follow a clean architecture approach, separating **Data Layers** (Repositories, Services), **Business Logic** (BLoCs/Cubits), and **UI** (Screens, Widgets).

**Q: How do I add a new language?**
A: Add the arb file in `lib/l10n/`, update the translations, and run `flutter gen-l10n`.

---

*Built with ❤️ by the Meetro Team.*


