/* ===========================
   CHRONICLE — Local JSON Database Service
   Simulates 2NF MySQL database using data/chronicle_db.json + localStorage
   =========================== */

var ChronicleDB = (function () {
  var STORAGE_KEY = "chronicle_local_db";

  // In-memory fallback if storage isn't initialized yet
  var defaultDb = {
    users: [
      { user_id: 1, username: "mounika.shetty", full_name: "Mounika Shetty", email: "mounika@example.com", avatar: "MS" },
      { user_id: 2, username: "daron.john", full_name: "Daron John", email: "daron@example.com", avatar: "DJ" },
      { user_id: 3, username: "sanjay.patil", full_name: "Sanjay Patil", email: "sanjay@example.com", avatar: "SP" },
      { user_id: 4, username: "kishan.kumar", full_name: "Kishan Kumar", email: "kishan@example.com", avatar: "KK" },
      { user_id: 5, username: "ananya.rao", full_name: "Ananya Rao", email: "ananya@example.com", avatar: "AR" },
      { user_id: 6, username: "rahul.nair", full_name: "Rahul Nair", email: "rahul@example.com", avatar: "RN" }
    ],
    capsules: [
      {
        capsule_id: "CHR-2026-001",
        creator_id: 2,
        creator_name: "Daron John",
        title: "Graduation Day",
        message: "Reflecting on our journey through web technologies, late night coding sessions, and building Chronicle together. Don't forget where it all began!",
        category: "Milestone",
        media_url: null,
        unlock_date: new Date(Date.now() + 126 * 24 * 60 * 60 * 1000).toISOString(),
        display_unlock_date: "14 February 2027",
        is_public: true,
        parent_capsule_id: null,
        chain_count: 1,
        created_at: "2026-10-11T10:00:00Z"
      },
      {
        capsule_id: "CHR-2026-002",
        creator_id: 2,
        creator_name: "Daron John",
        title: "Open When You're 30",
        message: "A milestone checkpoint for your future self. Are you still coding? Have you traveled to Japan? Stay true to your principles.",
        category: "Personal",
        media_url: null,
        unlock_date: "2028-10-11T00:00:00Z",
        display_unlock_date: "11 October 2028",
        is_public: false,
        parent_capsule_id: null,
        chain_count: 1,
        created_at: "2026-09-01T12:00:00Z"
      },
      {
        capsule_id: "CHR-2026-003",
        creator_id: 1,
        creator_name: "Mounika Shetty",
        title: "A Letter to My Future Self",
        message: "Dear Future Me,\n\nIf you're reading this, you've made it. I hope the world is kinder now, and that you've become someone I'd be proud of.\n\nRemember the late nights, the doubts, the small wins that kept you going. None of it was wasted.\n\nKeep creating. Keep caring.\n\n— Past You",
        category: "Friendship",
        media_url: "https://example.com/photo-album",
        unlock_date: new Date(Date.now() - 3600 * 1000).toISOString(),
        display_unlock_date: "Today (Ready to Unlock)",
        is_public: true,
        parent_capsule_id: null,
        chain_count: 3,
        created_at: "2026-08-15T14:30:00Z"
      },
      {
        capsule_id: "CHR-2026-004",
        creator_id: 3,
        creator_name: "Sanjay Patil",
        title: "Sprint Retrospective & Secret Project Milestone",
        message: "Great work completing the 10-page Chronicle platform with 2NF JSON database integration! Cheers to the team.",
        category: "Milestone",
        media_url: null,
        unlock_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        display_unlock_date: "Today at 19:30",
        is_public: false,
        parent_capsule_id: null,
        chain_count: 2,
        created_at: "2026-10-05T16:00:00Z"
      }
    ],
    capsule_recipients: [
      { recipient_id: 1, capsule_id: "CHR-2026-001", user_id: 2, recipient_name: "Myself (Daron John)", status: "sealed", opened_at: null },
      { recipient_id: 2, capsule_id: "CHR-2026-002", user_id: 2, recipient_name: "Myself (Daron John)", status: "sealed", opened_at: null },
      { recipient_id: 3, capsule_id: "CHR-2026-003", user_id: 2, recipient_name: "Daron John", status: "unlocked", opened_at: "2026-10-12T12:00:00Z" },
      { recipient_id: 4, capsule_id: "CHR-2026-004", user_id: 2, recipient_name: "Daron John", status: "sealed", opened_at: null }
    ]
  };

  /**
   * Load JSON database from localStorage or fetch data/chronicle_db.json
   */
  function getDB() {
    try {
      var cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Could not read localStorage for DB:", e);
    }
    // Initialize with default
    saveDB(defaultDb);
    return defaultDb;
  }

  function saveDB(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  /**
   * Asynchronously hydrate from data/chronicle_db.json if available
   */
  function initFromJSON() {
    if (typeof fetch === "function") {
      fetch("../data/chronicle_db.json")
        .then(function (res) {
          if (res.ok) return res.json();
          throw new Error("HTTP " + res.status);
        })
        .then(function (jsonData) {
          var current = getDB();
          // Merge users & capsules if not already customized
          if (!localStorage.getItem(STORAGE_KEY)) {
            saveDB(jsonData);
          }
        })
        .catch(function (err) {
          // Fallback to defaultDb silently
        });
    }
  }

  // Auto-init
  initFromJSON();

  return {
    /**
     * Get all registered users
     */
    getUsers: function () {
      var db = getDB();
      return db.users || [];
    },

    /**
     * Find user by username or email
     */
    findUser: function (query) {
      var db = getDB();
      var q = query.toLowerCase();
      return (db.users || []).find(function (u) {
        return u.username.toLowerCase() === q || u.email.toLowerCase() === q;
      });
    },

    /**
     * Add new user (Registration)
     */
    addUser: function (newUser) {
      var db = getDB();
      newUser.user_id = (db.users.length > 0) ? Math.max.apply(null, db.users.map(function(u){ return u.user_id; })) + 1 : 1;
      db.users.push(newUser);
      saveDB(db);
      return newUser;
    },

    /**
     * Get all capsules joined with recipient info for Vault display (2NF join)
     */
    getVaultCapsules: function () {
      var db = getDB();
      var capsules = db.capsules || [];
      var recipients = db.capsule_recipients || [];

      return capsules.map(function (c) {
        var recLinks = recipients.filter(function (r) {
          return r.capsule_id === c.capsule_id;
        });

        var recipientNames = recLinks.map(function (r) { return r.recipient_name; }).join(", ") || "Myself";
        var isUnlocked = recLinks.some(function (r) { return r.status === "unlocked"; });

        return {
          id: c.capsule_id,
          title: c.title,
          message: c.message,
          category: c.category,
          creator: c.creator_name,
          creatorId: c.creator_id,
          recipient: recipientNames,
          unlockDate: c.unlock_date,
          displayUnlockDate: c.display_unlock_date,
          dateCreated: new Date(c.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
          isPublic: c.is_public,
          status: isUnlocked ? "ready" : "sealed",
          chainCount: c.chain_count || 1,
          parentCapsuleId: c.parent_capsule_id
        };
      });
    },

    /**
     * Save new capsule and its recipients (2NF insert)
     */
    createCapsule: function (capsuleData, recipientsList, recipientMode) {
      var db = getDB();

      var newCapId = "CHR-2026-" + Math.floor(100 + Math.random() * 900);
      var newCapsule = {
        capsule_id: newCapId,
        creator_id: 2, // Default Daron John
        creator_name: "Daron John",
        title: capsuleData.title,
        message: capsuleData.message,
        category: capsuleData.category || "Personal",
        media_url: capsuleData.media_url || null,
        unlock_date: capsuleData.unlock_date,
        display_unlock_date: capsuleData.display_unlock_date,
        is_public: capsuleData.is_public || false,
        parent_capsule_id: capsuleData.parent_capsule_id || null,
        chain_count: 1,
        created_at: new Date().toISOString()
      };

      db.capsules.unshift(newCapsule);

      // Insert recipients into Capsule_Recipients table
      if (recipientMode === "myself" || !recipientsList || recipientsList.length === 0) {
        db.capsule_recipients.push({
          recipient_id: db.capsule_recipients.length + 1,
          capsule_id: newCapId,
          user_id: 2,
          recipient_name: "Myself (Daron John)",
          status: "sealed",
          opened_at: null
        });
      } else {
        recipientsList.forEach(function (user) {
          db.capsule_recipients.push({
            recipient_id: db.capsule_recipients.length + 1,
            capsule_id: newCapId,
            user_id: user.id || 1,
            recipient_name: user.name || user.username,
            status: "sealed",
            opened_at: null
          });
        });
      }

      saveDB(db);
      return newCapsule;
    },

    /**
     * Mark capsule as opened / unlocked
     */
    unlockCapsule: function (capsuleId) {
      var db = getDB();
      db.capsule_recipients.forEach(function (r) {
        if (r.capsule_id === capsuleId) {
          r.status = "unlocked";
          r.opened_at = new Date().toISOString();
        }
      });
      saveDB(db);
    },

    /**
     * Export raw database as JSON string
     */
    exportJSON: function () {
      return JSON.stringify(getDB(), null, 2);
    }
  };
})();
