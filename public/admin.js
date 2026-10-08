(function () {
  "use strict"

  function $(id) {
    return document.getElementById(id)
  }

  function api(path, options) {
    options = options || {}

    var init = {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" }
    }

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body)
    }

    return fetch(path, init).then(function (res) {
      return res.json().catch(function () {
        return {}
      }).then(function (data) {
        if (!res.ok) {
          throw {
            status: res.status,
            error: (data && data.error) || "حصلت مشكلة، حاول تاني."
          }
        }
        return data
      })
    })
  }

  var users = []
  var applications = []
  var currentUserDetail = null

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    } catch (e) {
      return iso || ""
    }
  }

  function toggle(el, show) {
    if (el) el.classList.toggle("hidden", !show)
  }

  function renderStats() {
    api("/api/admin/stats").then(function (data) {
      $("statUsers").textContent = data.totalUsers
      $("statConversations").textContent = data.totalConversations
      $("statApplications").textContent = data.totalApplications
    }).catch(function () {})
  }

  function renderUsers() {
    var query = ($("userSearch").value || "").trim().toLowerCase()
    var body = $("usersBody")
    body.innerHTML = ""

    var filtered = users.filter(function (u) {
      if (!query) return true
      return (
        (u.fullName || "").toLowerCase().indexOf(query) !== -1 ||
        (u.email || "").toLowerCase().indexOf(query) !== -1
      )
    })

    toggle($("usersEmpty"), filtered.length === 0)

    for (var i = 0; i < filtered.length; i++) {
      var u = filtered[i]

      var tr = document.createElement("tr")

      var tdName = document.createElement("td")
      tdName.className = "cell-name"
      tdName.dir = "auto"
      tdName.textContent = u.fullName

      var tdEmail = document.createElement("td")
      tdEmail.className = "cell-email"
      tdEmail.textContent = u.email

      var tdDate = document.createElement("td")
      tdDate.textContent = formatDate(u.createdAt)

      var tdRole = document.createElement("td")
      var badge = document.createElement("span")
      badge.className = "role-badge " + (u.role === "admin" ? "admin" : "user")
      badge.textContent = u.role === "admin" ? "مسؤول" : "مستخدم"
      tdRole.appendChild(badge)

      var tdCount = document.createElement("td")
      tdCount.textContent = u.conversationCount

      var tdAction = document.createElement("td")
      var viewBtn = document.createElement("button")
      viewBtn.type = "button"
      viewBtn.className = "view-btn"
      viewBtn.textContent = "عرض التفاصيل"
      viewBtn.addEventListener("click", (function (userId) {
        return function () {
          openUserModal(userId)
        }
      })(u.id))
      tdAction.appendChild(viewBtn)

      tr.appendChild(tdName)
      tr.appendChild(tdEmail)
      tr.appendChild(tdDate)
      tr.appendChild(tdRole)
      tr.appendChild(tdCount)
      tr.appendChild(tdAction)

      body.appendChild(tr)
    }
  }

  function renderApplications() {
    var query = ($("applicationSearch").value || "").trim().toLowerCase()
    var list = $("applicationsList")
    list.innerHTML = ""

    var filtered = applications.filter(function (entry) {
      if (!query) return true
      var a = entry.application || {}
      return [
        a.fullName, a.email, a.phone, a.request, a.role, a.skills, a.notes
      ].some(function (value) {
        return value && String(value).toLowerCase().indexOf(query) !== -1
      })
    })

    toggle($("applicationsEmpty"), filtered.length === 0)

    for (var i = 0; i < filtered.length; i++) {
      var entry = filtered[i]
      var a = entry.application || {}

      var card = document.createElement("div")
      card.className = "application-card"

      var head = document.createElement("div")
      head.className = "application-head"

      var name = document.createElement("div")
      name.className = "application-name"
      name.dir = "auto"
      name.textContent = a.fullName || "بدون اسم"

      var date = document.createElement("div")
      date.className = "application-date"
      date.textContent = formatDate(entry.receivedAt)

      head.appendChild(name)
      head.appendChild(date)
      card.appendChild(head)

      var fields = document.createElement("div")
      fields.className = "application-fields"

      function addField(label, value, isEnglish) {
        if (value === undefined || value === null || value === "") return
        var field = document.createElement("div")
        field.className = "app-field"
        var labelEl = document.createElement("span")
        labelEl.className = "app-field-label"
        labelEl.textContent = label
        var valueEl = document.createElement("span")
        valueEl.className = "app-field-value" + (isEnglish ? " en" : "")
        if (!isEnglish) valueEl.dir = "auto"
        valueEl.textContent = value
        field.appendChild(labelEl)
        field.appendChild(valueEl)
        fields.appendChild(field)
      }

      addField("الهاتف:", a.phone, true)
      addField("الإيميل:", a.email, true)
      addField("الجامعة:", a.university)
      addField("الكلية:", a.faculty)
      addField("السنة الدراسية:", a.academicYear)
      addField("الطلب:", a.request)
      addField("اللجنة/الدور:", a.role)
      addField("المهارات:", a.skills)
      addField("ملاحظات:", a.notes)

      card.appendChild(fields)
      list.appendChild(card)
    }
  }

  function openModal() {
    $("modalContent").innerHTML = ""
    $("modal").classList.remove("hidden")
  }

  function closeModal() {
    $("modal").classList.add("hidden")
    $("modalContent").innerHTML = ""
    currentUserDetail = null
  }

  function openUserModal(userId) {
    openModal()
    api("/api/admin/users/" + encodeURIComponent(userId)).then(function (data) {
      currentUserDetail = data
      renderUserModal(data)
    }).catch(function (err) {
      $("modalContent").textContent = (err && err.error) || "حصلت مشكلة."
    })
  }

  function renderUserModal(data) {
    var content = $("modalContent")
    content.innerHTML = ""

    var h3 = document.createElement("h3")
    h3.dir = "auto"
    h3.textContent = data.user.fullName
    content.appendChild(h3)

    var sub = document.createElement("div")
    sub.className = "modal-sub"
    sub.textContent = data.user.email
    content.appendChild(sub)

    var grid = document.createElement("div")
    grid.className = "detail-grid"

    function detail(label, value) {
      var field = document.createElement("div")
      field.className = "app-field"
      var labelEl = document.createElement("span")
      labelEl.className = "app-field-label"
      labelEl.textContent = label
      var valueEl = document.createElement("span")
      valueEl.className = "app-field-value"
      valueEl.dir = "auto"
      valueEl.textContent = value
      field.appendChild(labelEl)
      field.appendChild(valueEl)
      return field
    }

    grid.appendChild(detail("الإيميل:", data.user.email))
    grid.appendChild(detail("تاريخ التسجيل:", formatDate(data.user.createdAt)))
    grid.appendChild(detail("النوع:", data.user.role === "admin" ? "مسؤول" : "مستخدم"))
    grid.appendChild(detail("عدد المحادثات:", String(data.conversations.length)))

    content.appendChild(grid)

    var title = document.createElement("div")
    title.className = "modal-sub"
    title.textContent = "المحادثات:"
    content.appendChild(title)

    var list = document.createElement("div")
    list.className = "conv-list"

    if (!data.conversations.length) {
      var empty = document.createElement("div")
      empty.className = "empty"
      empty.textContent = "لا يوجد محادثات للمستخدم ده."
      list.appendChild(empty)
    }

    for (var i = 0; i < data.conversations.length; i++) {
      var conv = data.conversations[i]
      var row = document.createElement("div")
      row.className = "conv-row"

      var rowTitle = document.createElement("div")
      rowTitle.className = "conv-row-title"
      rowTitle.dir = "auto"
      rowTitle.textContent = conv.title || "محادثة"

      var meta = document.createElement("div")
      meta.className = "conv-row-meta"
      meta.textContent = conv.messageCount + " رسالة · " + formatDate(conv.updatedAt)

      row.appendChild(rowTitle)
      row.appendChild(meta)

      row.addEventListener("click", (function (conversationId) {
        return function () {
          openConversationModal(conversationId)
        }
      })(conv.id))

      list.appendChild(row)
    }

    content.appendChild(list)
  }

  function openConversationModal(conversationId) {
    openModal()
    api("/api/admin/conversations/" + encodeURIComponent(conversationId)).then(function (data) {
      renderConversationModal(data.conversation)
    }).catch(function (err) {
      $("modalContent").textContent = (err && err.error) || "حصلت مشكلة."
    })
  }

  function renderConversationModal(conversation) {
    var content = $("modalContent")
    content.innerHTML = ""

    var back = document.createElement("button")
    back.type = "button"
    back.className = "back-btn"
    back.textContent = "← رجوع لبيانات المستخدم"
    back.addEventListener("click", function () {
      if (currentUserDetail) {
        openModal()
        renderUserModal(currentUserDetail)
      }
    })
    content.appendChild(back)

    var h3 = document.createElement("h3")
    h3.dir = "auto"
    h3.textContent = conversation.title || "محادثة"
    content.appendChild(h3)

    var sub = document.createElement("div")
    sub.className = "modal-sub"
    sub.textContent = formatDate(conversation.createdAt) + " — " + formatDate(conversation.updatedAt)
    content.appendChild(sub)

    var messages = document.createElement("div")
    messages.className = "conv-messages"

    for (var i = 0; i < conversation.messages.length; i++) {
      var m = conversation.messages[i]

      var message = document.createElement("div")
      message.className = "conv-message " + m.role

      var label = document.createElement("span")
      label.className = "message-label"
      label.textContent = m.role === "user" ? "المستخدم" : "سارة"

      var text = document.createElement("span")
      text.dir = "auto"
      text.textContent = m.content

      message.appendChild(label)
      message.appendChild(text)
      messages.appendChild(message)
    }

    content.appendChild(messages)
  }

  $("logoutBtn").addEventListener("click", function () {
    api("/api/auth/logout", { method: "POST", body: {} }).catch(function () {}).then(function () {
      window.location.href = "/"
    })
  })

  $("modalClose").addEventListener("click", closeModal)

  $("modal").addEventListener("click", function (e) {
    if (e.target === this) closeModal()
  })

  $("userSearch").addEventListener("input", renderUsers)
  $("applicationSearch").addEventListener("input", renderApplications)

  api("/api/auth/me").then(function (data) {
    if (!data.user || data.user.role !== "admin") {
      toggle($("denied"), true)
      return
    }
    toggle($("adminMain"), true)
    renderStats()
    api("/api/admin/users").then(function (data) {
      users = data.users || []
      renderUsers()
    }).catch(function () {})
    api("/api/admin/applications").then(function (data) {
      applications = data.applications || []
      renderApplications()
    }).catch(function () {})
  }).catch(function () {
    window.location.href = "/"
  })
})()
