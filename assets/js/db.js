/* ===========================
   CHRONICLE — Local JSON Database Service
   Simulates 2NF MySQL database using data/chronicle_db.json + localStorage
   =========================== */

var ChronicleDB = (function () {
  var STORAGE_KEY = "chronicle_local_db_v2";

  // Clean empty database — users and capsules are created fresh by real interaction
  var defaultDb = {
    users: [],
    capsules: [],
    capsule_recipients: []
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
          var changed = false;

          // 1. Purge legacy removed users and their capsules
          var removedUsernames = ["mounika.shetty", "daron.john", "sanjay.patil", "ananya.rao", "rahul.nair"];
          var removedCreators = ["mounika shetty", "daron john", "sanjay patil", "ananya rao", "rahul nair"];

          var initialUserCount = (current.users || []).length;
          current.users = (current.users || []).filter(function (u) {
            return u && u.username && !removedUsernames.includes(u.username.toLowerCase());
          });
          if (current.users.length !== initialUserCount) changed = true;

          var initialCapCount = (current.capsules || []).length;
          current.capsules = (current.capsules || []).filter(function (c) {
            var cName = (c.creator_name || c.creator || "").toLowerCase().trim();
            return !removedCreators.includes(cName);
          });
          if (current.capsules.length !== initialCapCount) changed = true;

          var validCapIds = (current.capsules || []).map(function (c) { return c.capsule_id; });
          var initialRecCount = (current.capsule_recipients || []).length;
          current.capsule_recipients = (current.capsule_recipients || []).filter(function (r) {
            return r && validCapIds.includes(r.capsule_id);
          });
          if (current.capsule_recipients.length !== initialRecCount) changed = true;

          // Also purge removed users from standalone localStorage keys
          try {
            var reg = JSON.parse(localStorage.getItem("chronicle_registered_users_v2") || "[]");
            var filteredReg = reg.filter(function (u) {
              return u && u.username && !removedUsernames.includes(u.username.toLowerCase());
            });
            if (filteredReg.length !== reg.length) {
              localStorage.setItem("chronicle_registered_users_v2", JSON.stringify(filteredReg));
            }
          } catch (e) {}

          try {
            var vc = JSON.parse(localStorage.getItem("chronicle_vault_capsules") || "[]");
            var filteredVc = vc.filter(function (c) {
              var cName = (c.creator || c.creator_name || "").toLowerCase().trim();
              return !removedCreators.includes(cName);
            });
            if (filteredVc.length !== vc.length) {
              localStorage.setItem("chronicle_vault_capsules", JSON.stringify(filteredVc));
            }
          } catch (e) {}

          // 2. Merge seed users (sanjayrao, kishan) if not already present
          if (jsonData.users && Array.isArray(jsonData.users)) {
            current.users = current.users || [];
            jsonData.users.forEach(function (ju) {
              var exists = current.users.some(function (u) {
                return (u.username && ju.username && u.username.toLowerCase() === ju.username.toLowerCase()) ||
                       (u.email && ju.email && u.email.toLowerCase() === ju.email.toLowerCase());
              });
              if (!exists) {
                current.users.push(ju);
                changed = true;
              }
            });
          }

          // 3. Merge seed capsules if not already present
          if (jsonData.capsules && Array.isArray(jsonData.capsules)) {
            current.capsules = current.capsules || [];
            jsonData.capsules.forEach(function (jc) {
              var exists = current.capsules.some(function (c) {
                return c.capsule_id === jc.capsule_id;
              });
              if (!exists) {
                current.capsules.push(jc);
                changed = true;
              }
            });
          }

          // 4. Merge seed recipients if not already present
          if (jsonData.capsule_recipients && Array.isArray(jsonData.capsule_recipients)) {
            current.capsule_recipients = current.capsule_recipients || [];
            jsonData.capsule_recipients.forEach(function (jr) {
              var exists = current.capsule_recipients.some(function (r) {
                return r.recipient_id === jr.recipient_id;
              });
              if (!exists) {
                current.capsule_recipients.push(jr);
                changed = true;
              }
            });
          }

          if (changed || !localStorage.getItem(STORAGE_KEY)) {
            saveDB(current);
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
      if (!newUser.password) newUser.password = "password123";
      db.users.push(newUser);
      saveDB(db);

      // Keep chronicle_registered_users_v2 in sync
      try {
        var reg = JSON.parse(localStorage.getItem("chronicle_registered_users_v2") || "[]");
        var already = reg.some(function (u) {
          return (u.username && newUser.username && u.username.toLowerCase() === newUser.username.toLowerCase()) ||
                 (u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase());
        });
        if (!already) {
          reg.push({
            id: newUser.user_id,
            user_id: newUser.user_id,
            username: newUser.username,
            name: newUser.full_name || newUser.name || newUser.username,
            email: newUser.email,
            password: newUser.password,
            avatar: newUser.avatar || (newUser.username ? newUser.username.slice(0, 2).toUpperCase() : "U")
          });
          localStorage.setItem("chronicle_registered_users_v2", JSON.stringify(reg));
        }
      } catch (e) {}

      return newUser;
    },

    /**
     * Get capsules joined with recipient info for Vault display (2NF join)
     * Strictly isolates vault data: only returns capsules created by or sent to the specified user
     */
    getVaultCapsules: function (forUser) {
      var db = getDB();
      var capsules = db.capsules || [];
      var recipients = db.capsule_recipients || [];
      var user = forUser || (typeof getActiveUser === "function" ? getActiveUser() : null);

      if (user) {
        var myId = user.id || user.user_id;
        var myName = (user.name || user.full_name || "").trim().toLowerCase();
        var myUsername = (user.username || "").trim().toLowerCase();
        var myEmail = (user.email || "").trim().toLowerCase();

        capsules = capsules.filter(function (c) {
          // 1. Is this capsule created by this user?
          var isCreator = false;
          if (myId && c.creator_id && String(c.creator_id) === String(myId)) isCreator = true;
          if (myName && (c.creator_name || "").trim().toLowerCase() === myName) isCreator = true;
          if (myUsername && (c.creator_name || "").trim().toLowerCase() === myUsername) isCreator = true;
          if (isCreator) return true;

          // 2. Is this capsule sent to this user as a recipient?
          var isRecipient = recipients.some(function (r) {
            if (r.capsule_id !== c.capsule_id) return false;

            var rName = (r.recipient_name || "").trim().toLowerCase();
            var rEmail = (r.recipient_email || "").trim().toLowerCase();

            // Self-addressed capsules ("Myself (...)") belong exclusively to their creator
            if (rName.startsWith("myself")) {
              return false;
            }

            if (myId && r.user_id && String(r.user_id) === String(myId)) return true;
            if (myUsername && rName.includes(myUsername)) return true;
            if (myName && rName.includes(myName)) return true;
            if (myEmail && (rName.includes(myEmail) || rEmail === myEmail)) return true;
            return false;
          });

          return isRecipient;
        });
      }

      return capsules.map(function (c) {
        var recLinks = recipients.filter(function (r) {
          return r.capsule_id === c.capsule_id;
        });

        var recipientNames = recLinks.map(function (r) { return r.recipient_name; }).join(", ") || "Myself";
        var isUnlocked = recLinks.some(function (r) { return r.status === "unlocked"; }) ||
                         c.status === "unlocked" ||
                         (c.unlock_date && new Date(c.unlock_date).getTime() <= Date.now());

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
          notifyEmail: c.notify_email !== false,
          status: isUnlocked ? "unlocked" : "sealed",
          chainCount: c.chain_count || 1,
          parentCapsuleId: c.parent_capsule_id
        };
      });
    },

    /**
     * Save new capsule and its recipients (2NF insert)
     */
    createCapsule: function (capsuleData, recipientsList, recipientMode, activeUser) {
      var db = getDB();
      var user = activeUser || (typeof getActiveUser === "function" ? getActiveUser() : null);

      var creatorId = user ? (user.id || user.user_id || 1) : 1;
      var creatorName = user ? (user.name || user.full_name || user.username || "Creator") : "Creator";

      var newCapId = "CHR-2026-" + Math.floor(100 + Math.random() * 900);
      var creatorEmail = user ? (user.email || "") : "";
      var newCapsule = {
        capsule_id: newCapId,
        creator_id: creatorId,
        creator_name: creatorName,
        title: capsuleData.title,
        message: capsuleData.message,
        category: capsuleData.category || "Personal",
        media_url: capsuleData.media_url || null,
        unlock_date: capsuleData.unlock_date,
        display_unlock_date: capsuleData.display_unlock_date,
        is_public: capsuleData.is_public || false,
        notify_email: capsuleData.notify_email !== undefined ? capsuleData.notify_email : true,
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
          user_id: creatorId,
          recipient_name: "Myself (" + creatorName + ")",
          recipient_email: creatorEmail,
          status: "sealed",
          opened_at: null
        });
      } else {
        recipientsList.forEach(function (recUser) {
          db.capsule_recipients.push({
            recipient_id: db.capsule_recipients.length + 1,
            capsule_id: newCapId,
            user_id: recUser.id || recUser.user_id || 1,
            recipient_name: recUser.name || recUser.full_name || recUser.username,
            recipient_email: recUser.email || "",
            status: "sealed",
            opened_at: null
          });
        });
      }

      saveDB(db);
      return newCapsule;
    },

    /**
     * Get a specific capsule by ID
     */
    getCapsuleById: function (id) {
      var db = getDB();
      return (db.capsules || []).find(function (c) { return c.capsule_id === id; }) || null;
    },

    /**
     * Get the journey chain for a capsule
     */
    getJourneyChain: function (capsuleId) {
      var db = getDB();
      var capsules = db.capsules || [];
      var recipients = db.capsule_recipients || [];
      var target = capsules.find(function (c) { return c.capsule_id === capsuleId; });
      if (!target) return [];

      // Find root capsule
      var root = target;
      while (root.parent_capsule_id) {
        var parent = capsules.find(function (c) { return c.capsule_id === root.parent_capsule_id; });
        if (parent) {
          root = parent;
        } else {
          break;
        }
      }

      var chain = [];
      chain.push({
        name: root.creator_name || "Author",
        action: "Created",
        date: new Date(root.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        active: false,
        message: root.message
      });

      // Find all forwarded children
      var children = capsules.filter(function (c) { return c.parent_capsule_id === root.capsule_id || c.parent_capsule_id === target.capsule_id; });
      children.forEach(function (hop) {
        var recLinks = recipients.filter(function (r) { return r.capsule_id === hop.capsule_id; });
        var recName = recLinks.map(function (r) { return r.recipient_name; }).join(", ") || "Friend";
        chain.push({
          name: hop.creator_name,
          action: "Forwarded to " + recName,
          date: new Date(hop.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
          active: false,
          message: hop.message
        });
      });

      return chain;
    },

    /**
     * Continue a capsule's journey by forwarding it to another user
     */
    continueJourney: function (capsuleId, recipientUser, forwardMessage, activeUser) {
      var db = getDB();
      var sender = activeUser || (typeof getActiveUser === "function" ? getActiveUser() : null);
      var senderId = sender ? (sender.id || sender.user_id) : 1;
      var senderName = sender ? (sender.name || sender.full_name || sender.username) : "Author";

      var orig = (db.capsules || []).find(function (c) { return c.capsule_id === capsuleId; });
      var title = orig ? orig.title : "Journey Capsule";
      var category = orig ? orig.category : "Friendship";

      var newCapId = "CHR-2026-" + Math.floor(100 + Math.random() * 900);
      var chainedCapsule = {
        capsule_id: newCapId,
        creator_id: senderId,
        creator_name: senderName,
        title: title,
        message: forwardMessage || (orig ? orig.message : "Continuing journey"),
        category: category,
        media_url: orig ? orig.media_url : null,
        unlock_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        display_unlock_date: "1 Week from Now",
        is_public: false,
        parent_capsule_id: capsuleId,
        chain_count: (orig && orig.chain_count ? orig.chain_count + 1 : 2),
        created_at: new Date().toISOString()
      };

      db.capsules.unshift(chainedCapsule);

      // Increment chain count on original
      if (orig) {
        orig.chain_count = (orig.chain_count || 1) + 1;
      }

      // Add recipient record for recipientUser
      db.capsule_recipients.push({
        recipient_id: db.capsule_recipients.length + 1,
        capsule_id: newCapId,
        user_id: recipientUser.id || recipientUser.user_id || 1,
        recipient_name: recipientUser.name || recipientUser.full_name || recipientUser.username,
        status: "sealed",
        opened_at: null
      });

      saveDB(db);
      return chainedCapsule;
    },

    /**
     * Mark capsule as opened / unlocked
     */
    unlockCapsule: function (capsuleId) {
      var db = getDB();
      db.capsules.forEach(function (c) {
        if (c.capsule_id === capsuleId) {
          c.status = "unlocked";
        }
      });
      db.capsule_recipients.forEach(function (r) {
        if (r.capsule_id === capsuleId) {
          r.status = "unlocked";
          r.opened_at = new Date().toISOString();
        }
      });
      saveDB(db);

      try {
        var vaultCaps = JSON.parse(localStorage.getItem("chronicle_vault_capsules") || "[]");
        vaultCaps.forEach(function (c) {
          if (c.id === capsuleId) {
            c.status = "unlocked";
          }
        });
        localStorage.setItem("chronicle_vault_capsules", JSON.stringify(vaultCaps));
      } catch (e) {}
    },

    /**
     * Get all unlocked capsules for a user that can be passed forward in a journey
     */
    getUnlockedCapsules: function (forUser) {
      var all = this.getVaultCapsules(forUser);
      return all.filter(function (c) {
        return c.status === "unlocked" ||
               c.status === "ready" ||
               (c.unlockDate && new Date(c.unlockDate).getTime() <= Date.now());
      });
    },

    /**
     * Export raw database as JSON string
     */
    exportJSON: function () {
      return JSON.stringify(getDB(), null, 2);
    }
  };
})();
