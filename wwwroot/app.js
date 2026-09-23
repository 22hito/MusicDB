// ================================================================
// DATA
// ================================================================
// ================================================================
// I18N (українська / англійська)
// ================================================================
const I18N = {
  uk: {
    'nav.home': 'Головна',
    'nav.request': 'Надіслати запит',
    'nav.admin': 'Адмін — Запити',
    'nav.add': 'Додати пісню',
    'nav.adminHub': 'Адмін-панель',
    'adminHub.heading.pre': 'Адмін',
    'adminHub.heading.accent': 'панель',
    'adminHub.requestsTab': 'Запити',
    'adminHub.addTab': 'Додати пісню',
    'nav.desktopApp': 'Застосунок для ПК',
    'nav.menu': 'Меню',
    'nav.top': 'Топ 100',
    'top.heading.pre': 'Топ 100',
    'top.heading.accent': 'найпрослуханіших',
    'top.empty': 'Ще немає прослуховувань',
    'theme.toggle': 'Змінити тему',
    'theme.dark': 'Темна',
    'theme.gray': 'Сіра',
    'theme.system': 'Системна',
    'nav.settings': 'Налаштування',
    'settings.heading.pre': 'Налаштування',
    'settings.heading.accent': 'інтерфейсу',
    'settings.lead': 'Зберігаються на цьому пристрої й діють одразу, без перезавантаження.',
    'settings.appearance': 'Вигляд',
    'settings.appearance.sub': 'Тема, колір, розмір і щільність',
    'settings.theme': 'Тема',
    'settings.accent': 'Акцентний колір',
    'settings.accent.hint': 'Кнопки, посилання, цифри статистики. Контраст підлаштовується під тему автоматично.',
    'settings.accent.amber': 'Бурштин',
    'settings.accent.coral': 'Корал',
    'settings.accent.rose': 'Троянда',
    'settings.accent.lavender': 'Лаванда',
    'settings.accent.ocean': 'Океан',
    'settings.accent.emerald': 'Смарагд',
    'settings.fontScale': 'Розмір тексту',
    'settings.density': 'Щільність таблиць',
    'settings.density.hint': 'Компактна вміщує більше пісень на екрані.',
    'settings.density.comfortable': 'Комфортна',
    'settings.density.compact': 'Компактна',
    'settings.contrast': 'Високий контраст',
    'settings.contrast.hint': 'Яскравіший другорядний текст і чіткіші межі.',
    'settings.motion.title': 'Рух і ефекти',
    'settings.motion.sub': 'Анімації та сяйво від обкладинки',
    'settings.motion': 'Анімації',
    'settings.motion.hint': '"Системні" — як у налаштуваннях доступності ОС. "Зменшені" — без руху й переходів.',
    'settings.motion.system': 'Системні',
    'settings.motion.full': 'Увімкнені',
    'settings.motion.reduced': 'Зменшені',
    'settings.artColors': 'Кольори з обкладинки',
    'settings.artColors.hint': 'Сяйво й плеєр підфарбовуються палітрою пісні, що грає.',
    'settings.glowFollow': 'Сяйво йде за піснею',
    'settings.glowFollow.hint': 'Світла пляма пливе сторінкою зліва направо разом із прогресом треку.',
    'settings.glow': 'Інтенсивність сяйва',
    'settings.grain': 'Плівкова зернистість',
    'settings.grain.hint': 'Ледь помітна текстура фону.',
    'settings.language': 'Мова',
    'settings.language.sub': 'Мова інтерфейсу',
    'settings.keyboard': 'Клавіатура',
    'settings.keyboard.sub': 'Швидкі клавіші',
    'settings.playerKeys': 'Керування плеєром з клавіатури',
    'settings.playerKeys.hint': 'Не спрацьовують, поки ви друкуєте в полі вводу.',
    'settings.key.search': 'Пошук',
    'settings.key.play': 'Відтворення / пауза',
    'settings.key.space': 'Пробіл',
    'settings.key.next': 'Наступна пісня',
    'settings.key.prev': 'Попередня пісня',
    'settings.key.mute': 'Вимкнути / увімкнути звук',
    'settings.profileLink': 'Нікнейм і аватар',
    'settings.reset': 'Скинути до стандартних',
    'theme.light': 'Світла',
    'a11y.skip': 'Перейти до вмісту',
    'stat.songs': 'Композицій',
    'stat.genres': 'Жанрів',
    'stat.albums': 'Альбомів',
    'stat.singles': 'Сінглів',
    'home.heading.pre': 'Опубліковані',
    'home.heading.accent': 'пісні',
    'home.addRequestBtn': '+ Надіслати запит',
    'search.placeholder': 'Пошук за назвою, виконавцем або альбомом…',
    'filter.allGenres': 'Усі жанри',
    'table.shuffle': 'Перемішати',
    'nav.wheel': 'Колесо фортуни',
    'wheel.spinBtn': 'Крутити',
    'wheel.playBtn': 'Слухати',
    'wheel.resultLabel': 'Випав жанр:',
    'wheel.closeResult': 'Закрити',
    'wheel.legendTitle': 'Жанри на колесі',
    'wheel.countLabel': 'Кількість жанрів на колесі:',
    'wheel.durationLabel': 'Тривалість прокрутки, сек:',
    'wheel.durationTo': '—',
    'wheel.playlistEmpty': 'Крутніть колесо, щоб сформувати плейлист із випадкового жанру',
    'battle.openBtn': 'Батл рояль',
    'battle.setupTitle': 'Батл рояль',
    'battle.chooseSize': 'Оберіть розмір турніру:',
    'battle.notEnough': 'Замало пісень у плейлисті — потрібно щонайменше 16.',
    'battle.roundLabel': 'Учасників: ',
    'battle.vs': 'VS',
    'battle.chooseBtn': 'Обрати цю',
    'battle.hoverModeBtn': 'Режим наведення',
    'battle.hoverModeHint': 'Наведіть курсор на відео, щоб грало — заберіть курсор, щоб пауза',
    'nav.battle': 'Батл рояль',
    'nav.artists': 'Виконавці',
    'nav.friends': 'Друзі',
    'notif.bellTitle': 'Сповіщення',
    'notif.loading': 'Завантаження…',
    'notif.empty': 'Поки немає сповіщень',
    'notif.markAllRead': 'Позначити все прочитаним',
    'notif.markOneRead': 'Позначити прочитаним',
    'notif.event.songAdded': 'додано нову пісню',
    'notif.event.songRemoved': 'видалено пісню',
    'notif.event.lyricsAdded': 'додано текст пісні',
    'artists.heading.pre': 'Всі',
    'artists.heading.accent': 'виконавці',
    'artists.searchPlaceholder': 'Пошук виконавця…',
    'artists.empty': 'Нічого не знайдено',
    'artists.songsWord': 'пісень',
    'artist.followBtn': '+ Підписатись',
    'artist.unfollowBtn': 'Підписано',
    'artist.followers': 'підписників',
    'artist.discography': 'Дискографія',
    'artist.notFound': 'Виконавця не знайдено',
    'friends.heading.pre': 'Мої',
    'friends.heading.accent': 'друзі',
    'friends.searchPlaceholder': 'Пошук людей за іменем…',
    'friends.searchEmpty': 'Нікого не знайдено',
    'friends.incoming': 'Вхідні запити',
    'friends.incomingRequestLabel': 'хоче додати вас у друзі',
    'friends.outgoing': 'Надіслані запити',
    'friends.myFriends': 'Мої друзі',
    'friends.incomingEmpty': 'Немає вхідних запитів',
    'friends.outgoingEmpty': 'Немає надісланих запитів',
    'friends.friendsEmpty': 'Ще немає друзів — знайдіть когось через пошук вище',
    'friends.addBtn': '+ Додати в друзі',
    'friends.pendingLabel': 'Запит надіслано',
    'friends.cancelBtn': 'Скасувати',
    'friends.acceptBtn': 'Прийняти',
    'friends.rejectBtn': 'Відхилити',
    'friends.unfriendBtn': 'Розфрендити',
    'friends.friendsBadge': 'Друзі',
    'profile.public.back': 'До друзів',
    'profile.public.notFound': 'Користувача не знайдено',
    'profile.public.memberSince': 'На сайті з',
    'profile.public.publicPlaylistsCount': 'Публічних плейлистів',
    'profile.public.playlistsTitle': 'Публічні плейлисти',
    'profile.public.playlistsEmpty': 'Немає публічних плейлистів',
    'battle.heading.pre': 'Батл',
    'battle.heading.accent': 'рояль',
    'battle.pageOwnHeading': 'Мої плейлисти',
    'battle.pageOwnLoginHint': 'Увійдіть, щоб побачити тут свої плейлисти',
    'battle.pageOwnEmpty': 'У вас ще немає плейлистів — створіть їх у профілі',
    'battle.pagePublicHeading': 'Плейлисти спільноти',
    'battle.pagePublicEmpty': 'Ще немає публічних плейлистів — зробіть свій публічним у профілі',
    'battle.publicBadge': 'публічний',
    'battle.privateBadge': 'приватний',
    'battle.togglePublicHint': "Клік перемикає приватний/публічний — публічний бачать інші на сторінці \"Батл рояль\"",
    'battle.championLabel': 'Переможець',
    'battle.listenToWinnerBtn': 'Слухати переможця',
    'battle.videoNotFound': 'Відео не знайдено',
    'graph.openHint': 'Показати граф схожості',
    'graph.loading': 'Обчислюємо розташування…',
    'graph.hint': 'Чим ближче — тим більше схожі. Клік по вузлу — відтворити/перейти. Коліщатко/перетягування — масштаб і зсув.',
    'graph.titleSongs': 'Схожість композицій',
    'graph.titleGenres': 'Схожість жанрів',
    'graph.titleAlbums': 'Схожість альбомів',
    'graph.titleSingles': 'Схожість синглів',
    'table.number': '№',
    'table.artist': 'Виконавець',
    'table.title': 'Назва',
    'table.release': 'Дата релізу',
    'table.duration': 'Тривалість',
    'table.genres': 'Жанри',
    'table.album': 'Альбом',
    'table.plays': 'Прослух.',
    'table.action': 'Дія',
    'table.empty': 'Нічого не знайдено',
    'table.single': 'Сінгл',
    'request.heading.pre': 'Запит на',
    'request.heading.accent': 'додавання пісні',
    'request.successAlert': 'Запит успішно надіслано! Очікуйте підтвердження адміністратора.',
    'request.submitBtn': 'Надіслати запит',
    'extsearch.title': 'Схожі пісні (натисніть, щоб заповнити форму)',
    'extsearch.analyzingGenres': 'Аналізуємо жанри…',
    'form.artist': 'Виконавець *',
    'form.artist.placeholder': "Ім'я артиста",
    'form.title': 'Назва пісні *',
    'form.title.placeholder': 'Назва композиції',
    'form.release': 'Дата релізу *',
    'form.duration': 'Тривалість *',
    'form.duration.hint': 'Додатково: 31 (сек), 211 = 3:31 (хв:сек)',
    'form.album': "Альбом (необов'язково)",
    'form.album.placeholder': 'Назва альбому або залиште порожнім для сінглу',
    'form.genres': 'Жанри *',
    'form.genres.placeholder': 'Рок, Поп, Джаз',
    'form.genres.hint': 'Через кому',
    'admin.heading.pre': 'Запити',
    'admin.heading.accent': 'користувачів',
    'admin.empty': 'Немає нових запитів',
    'admin.approveBtn': 'Підтвердити',
    'admin.rejectBtn': 'Відмовити',
    'admin.editBtn': 'Редагувати',
    'admin.editTitle': 'Редагувати заявку',
    'admin.saveBtn': 'Зберегти',
    'msg.errorEditRequest': 'Помилка при збереженні змін',
    'admin.editSongTitle': 'Редагувати пісню',
    'admin.youtubeVideo': "YouTube-відео (необов'язково)",
    'admin.youtubeVideo.placeholder': 'ID або посилання на відео, або залиште порожнім',
    'admin.youtubeVideo.hint': 'Автоматично підібране й закешоване відео можна замінити чи очистити тут, якщо воно виявилось не тим',
    'admin.youtubeVideo.view': 'Переглянути на YouTube',
    'admin.lyrics': "Текст пісні (необов'язково)",
    'admin.lyrics.placeholder': 'Вставте текст пісні рядок за рядком, або залиште порожнім',
    'admin.normalizeGenresBtn': "Об'єднати дублікати жанрів",
    'admin.normalizeGenresRunning': 'Перевірка триває…',
    'admin.normalizeGenresNone': 'Дублікатів не знайдено — усі жанри унікальні.',
    'admin.normalizeGenresError': "Не вдалося звернутись до ШІ (перевірте ключ Gemini):",
    'admin.normalizeGenresDone': "Об'єднано груп: {count}",
    'msg.errorNormalizeGenres': "Помилка при об'єднанні жанрів",
    'msg.errorEditSong': 'Помилка при збереженні пісні',
    'add.heading.pre': 'Додати',
    'add.heading.accent': 'нову композицію',
    'add.successAlert': 'Композицію успішно додано до бази даних!',
    'add.submitBtn': 'Додати до бази',
    'page.title': "N'Owl",
    'player.shuffle': 'Перемішати',
    'player.prev': 'Попередня',
    'player.next': 'Наступна',
    'player.repeat': 'Повтор',
    'player.video': 'Відкрити відео',
    'player.karaoke': 'Текст',
    'player.karaokeEmpty': 'Для цієї пісні ще немає тексту',
    'player.editSong': 'Редагувати пісню',
    'player.close': 'Закрити',
    'videoPopup.title': 'Відео',
    'videoPopup.loading': 'Завантаження…',
    'videoPopup.expand': 'Розгорнути',
    'videoPopup.fullscreen': 'На весь екран',
    'videoPopup.popout': 'Перенести в окреме вікно',
    'video.notFoundSuffix': ' — відео не знайдено',
    'modal.deleteTitle': 'Видалити пісню?',
    'modal.deleteBodyTemplate': 'Композицію «{label}» буде видалено з бази без можливості відновлення.',
    'modal.deleteDefaultLabel': 'цю пісню',
    'modal.cancel': 'Скасувати',
    'modal.confirmDelete': 'Видалити',
    'auth.logout': 'Вийти',
    'auth.loginBtn': 'Увійти через Google',
    'msg.confirmLoginForRequest': 'Щоб надіслати запит, потрібно увійти через Google. Перейти до входу?',
    'msg.confirmLoginGeneric': 'Щоб продовжити, потрібно увійти через Google. Перейти до входу?',
    'nav.recommendations': 'Рекомендовано для вас',
    'nav.profile': 'Профіль',
    'nav.profileSettings': 'Налаштування',
    'profileSettings.heading.pre': 'Налаштування',
    'profileSettings.heading.accent': 'профілю',
    'profile.heading.pre': 'Мій',
    'profile.heading.accent': 'профіль',
    'profile.displayName': 'Нікнейм',
    'profile.avatar': 'Зображення профілю',
    'profile.avatarHint': 'Оберіть зображення з пристрою',
    'profile.avatarRemove': 'прибрати й повернути фото з Google',
    'profile.displayName.placeholder': 'Наприклад, MusicLover',
    'profile.saveBtn': 'Зберегти',
    'profile.totalListened': 'Прослухано',
    'profile.favoritesCount': 'Улюблених',
    'profile.playlistsCount': 'Плейлистів',
    'profile.topGenres': 'Улюблені жанри',
    'profile.favoritesTitle': 'Улюблені пісні',
    'profile.favoritesEmpty': 'Ще немає улюблених пісень',
    'profile.playlistsTitle': 'Мої плейлисти',
    'profile.newPlaylistBtn': '+ Новий плейлист',
    'profile.playlistsEmpty': 'Ще немає плейлистів',
    'profile.backToProfile': 'До профілю',
    'profile.playlistEmpty': 'У цьому плейлисті ще немає пісень',
    'profile.playBtn': 'Відтворити',
    'profile.playAllBtn': 'Слухати весь плейлист',
    'profile.favToggle': 'Улюблене',
    'player.addToPlaylist': 'Додати в плейлист',
    'profile.songsWord': 'пісень',
    'profile.newPlaylistPrompt': 'Назва нового плейлиста:',
    'profile.newPlaylistPublicConfirm': "Зробити плейлист публічним? Інші користувачі зможуть побачити й використати його на сторінці \"Батл рояль\" (не в іншому місці сайту). Скасувати — плейлист лишиться приватним, як завжди.",
    'profile.addToPlaylist': 'Додати в плейлист',
    'profile.addToPlaylistTitle': 'Додати в плейлист',
    'profile.newPlaylistPlaceholder': 'Назва нового плейлиста',
    'profile.createAndAddBtn': 'Створити й додати',
    'rec.heading.pre': 'Рекомендовано',
    'rec.heading.accent': 'для вас',
    'rec.loading': 'Підбираємо рекомендації…',
    'rec.empty': 'Послухайте кілька пісень, щоб отримати персональні рекомендації',
    'msg.needLoginForRequest': 'Для надсилання запиту потрібно увійти через Google.',
    'msg.fillRequiredFields': "Будь ласка, заповніть усі обов'язкові поля (*)",
    'msg.needLoginGeneric': 'Потрібно увійти через Google',
    'msg.errorSubmittingRequest': 'Помилка при надсиланні запиту',
    'msg.connectionError': "Помилка з'єднання з сервером",
    'msg.errorApprove': 'Помилка при підтвердженні',
    'msg.approveMerged': 'Така пісня вже є в базі — нові жанри додано до наявного запису.',
    'msg.needLoginAdmin': 'Потрібно увійти як адмін',
    'msg.errorDelete': 'Помилка видалення',
    'msg.errorReject': 'Помилка відхилення',
    'msg.needAdminRights': 'Потрібні права адміна',
    'msg.errorAddSong': 'Помилка додавання пісні',
    'nav.community': 'Пісні ком\'юніті',
    'nav.discussions': 'Обговорення',
    'nav.messages': 'Повідомлення',
    'navSearch.placeholder': 'Пісні, виконавці, люди…',
    'navSearch.songs': 'Пісні',
    'navSearch.artists': 'Виконавці',
    'navSearch.users': 'Люди',
    'navSearch.empty': 'Нічого не знайдено',
    'navSearch.loginForUsers': 'Увійдіть, щоб шукати людей',
    'home.source.catalog': 'Каталог',
    'home.source.community': 'Ком\'юніті',
    'home.communityHint': 'Власні пісні учасників спільноти — завантажені файлом або з посиланням на YouTube.',
    'home.heading.communityPre': 'Пісні від',
    'home.heading.communityAccent': 'ком\'юніті',
    'home.addOwnSongBtn': '+ Додати свою пісню',
    'table.rating': 'Оцінка',
    'table.submittedBy': 'Додав',
    'table.source': 'Таблиця',
    'table.communityEmpty': 'Тут ще немає пісень від ком\'юніті — додайте свою першою',
    'request.kind.catalog': 'Пісня до каталогу',
    'request.kind.community': 'Власна пісня (ком\'юніті)',
    'form.audioFile': 'Файл пісні',
    'form.audioFile.hint': 'MP3, M4A, OGG, WAV, FLAC — до 25 МБ. Необов\'язково, якщо вказано YouTube-відео.',
    'form.youtube': 'Посилання на YouTube-відео',
    'admin.audioReplaceHint': 'Оберіть файл, щоб замінити поточний',
    'msg.communityNeedsFileOrVideo': 'Додайте файл пісні або посилання на YouTube-відео.',
    'msg.audioTooLarge': 'Файл більший за 25 МБ.',
    'msg.uploading': 'Завантаження…',
    'audio.notFoundSuffix': ' — файл недоступний',
    'adminNotif.sectionTitle': 'Адміністрування',
    'notif.sectionTitle': 'Підписки й друзі',
    'adminNotif.someone': 'Хтось',
    'adminNotif.request_submitted': 'надсилає запит',
    'adminNotif.request_approved': 'схвалює запит',
    'adminNotif.request_rejected': 'відхиляє запит',
    'adminNotif.song_added': 'додав',
    'chat.heading.pre': 'Спілкування',
    'chat.heading.accent': 'ком\'юніті',
    'chat.tab.dm': 'Особисті повідомлення',
    'chat.tab.threads': 'Обговорення',
    'chat.loginHint': 'Увійдіть, щоб листуватися',
    'chat.newHint': 'Нова розмова — через пошук людей угорі або кнопку «Написати» в профілі.',
    'chat.noConversations': 'Ще немає розмов',
    'chat.pickConversation': 'Оберіть розмову ліворуч',
    'chat.inputPlaceholder': 'Напишіть повідомлення… (Enter — надіслати, Shift+Enter — новий рядок)',
    'chat.sendBtn': 'Надіслати',
    'chat.writeBtn': 'Написати',
    'chat.you': 'Ви',
    'chat.newConversation': 'Нова розмова',
    'chat.startConversation': 'Напишіть перше повідомлення',
    'threads.searchPlaceholder': 'Пошук гілки…',
    'threads.newBtn': '+ Нова гілка',
    'threads.titleLabel': 'Тема *',
    'threads.bodyLabel': 'Повідомлення *',
    'threads.createBtn': 'Створити гілку',
    'threads.empty': 'Ще немає обговорень — почніть перше',
    'threads.back': 'До всіх обговорень',
    'threads.loginToReply': 'Увійдіть, щоб відповісти',
    'threads.replyPlaceholder': 'Ваша відповідь…',
    'threads.replyBtn': 'Відповісти',
    'threads.deletedUser': 'видалений користувач',
    'threads.by': 'від',
    'threads.lastActivity': 'активність:',
    'threads.confirmDeleteThread': 'Видалити цю гілку разом з усіма відповідями?',
    'threads.confirmDeletePost': 'Видалити цю відповідь?',
    'rating.title': 'Оцінка пісні',
    'rating.yourScore': 'Ваша оцінка (0–100)',
    'rating.review': 'Рецензія (необов\'язково)',
    'rating.reviewPlaceholder': 'Що зачепило, що ні…',
    'rating.deleteBtn': 'Прибрати оцінку',
    'rating.loginHint': 'Увійдіть, щоб оцінити пісню й написати рецензію',
    'rating.reviewsTitle': 'Рецензії',
    'rating.rateBtn': 'Оцінити',
    'rating.summary': 'Середня оцінка: {avg} / 100 · оцінок: {count}',
    'rating.noRatings': 'Ще ніхто не оцінив',
    'rating.noReviews': 'Рецензій ще немає',
    'rating.confirmAdminDelete': 'Видалити цю оцінку й рецензію користувача?',
    'chat.tab.requests': 'Запити на листування',
    'chat.requestsHint': 'Друзі пишуть вам напряму. Інші люди можуть надіслати одне повідомлення — листування відкриється, лише якщо ви схвалите запит.',
    'chat.requestsEmpty': 'Немає нових запитів на листування',
    'chat.acceptRequest': 'Схвалити',
    'chat.declineRequest': 'Відхилити',
    'chat.pendingLabel': 'запит надіслано',
    'chat.state.none': 'Ви ще не друзі — перше повідомлення надійде як запит на листування. Далі писати можна буде після схвалення.',
    'chat.state.pendingOutgoing': 'Запит на листування надіслано. Писати далі можна буде, щойно співрозмовник його схвалить.',
    'chat.state.declined': 'Співрозмовник відхилив запит на листування.',
    'chat.state.pendingIncoming': 'Це запит на листування. Відповідь автоматично його схвалить.',
    'battle.communityTrack': "Трек ком'юніті"
  },
  en: {
    'nav.home': 'Home',
    'nav.request': 'Submit request',
    'nav.admin': 'Admin — Requests',
    'nav.add': 'Add song',
    'nav.adminHub': 'Admin panel',
    'adminHub.heading.pre': 'Admin',
    'adminHub.heading.accent': 'panel',
    'adminHub.requestsTab': 'Requests',
    'adminHub.addTab': 'Add song',
    'nav.desktopApp': 'Desktop app',
    'nav.menu': 'Menu',
    'nav.top': 'Top 100',
    'top.heading.pre': 'Top 100',
    'top.heading.accent': 'most played',
    'top.empty': 'No listens yet',
    'theme.toggle': 'Switch theme',
    'theme.dark': 'Dark',
    'theme.gray': 'Gray',
    'theme.system': 'System',
    'nav.settings': 'Settings',
    'settings.heading.pre': 'Interface',
    'settings.heading.accent': 'settings',
    'settings.lead': 'Saved on this device and applied instantly, no reload needed.',
    'settings.appearance': 'Appearance',
    'settings.appearance.sub': 'Theme, color, size and density',
    'settings.theme': 'Theme',
    'settings.accent': 'Accent color',
    'settings.accent.hint': 'Buttons, links, stat numbers. Contrast adapts to the theme automatically.',
    'settings.accent.amber': 'Amber',
    'settings.accent.coral': 'Coral',
    'settings.accent.rose': 'Rose',
    'settings.accent.lavender': 'Lavender',
    'settings.accent.ocean': 'Ocean',
    'settings.accent.emerald': 'Emerald',
    'settings.fontScale': 'Text size',
    'settings.density': 'Table density',
    'settings.density.hint': 'Compact fits more songs on screen.',
    'settings.density.comfortable': 'Comfortable',
    'settings.density.compact': 'Compact',
    'settings.contrast': 'High contrast',
    'settings.contrast.hint': 'Brighter secondary text and crisper borders.',
    'settings.motion.title': 'Motion & effects',
    'settings.motion.sub': 'Animations and the artwork glow',
    'settings.motion': 'Animations',
    'settings.motion.hint': '"System" follows your OS accessibility setting. "Reduced" removes motion and transitions.',
    'settings.motion.system': 'System',
    'settings.motion.full': 'On',
    'settings.motion.reduced': 'Reduced',
    'settings.artColors': 'Colors from artwork',
    'settings.artColors.hint': 'The glow and the player take on the palette of the playing song.',
    'settings.glowFollow': 'Glow follows the song',
    'settings.glowFollow.hint': 'A light spot drifts across the page left to right with the track progress.',
    'settings.glow': 'Glow intensity',
    'settings.grain': 'Film grain',
    'settings.grain.hint': 'A barely visible background texture.',
    'settings.language': 'Language',
    'settings.language.sub': 'Interface language',
    'settings.keyboard': 'Keyboard',
    'settings.keyboard.sub': 'Shortcuts',
    'settings.playerKeys': 'Control the player with the keyboard',
    'settings.playerKeys.hint': 'Disabled while you are typing in a field.',
    'settings.key.search': 'Search',
    'settings.key.play': 'Play / pause',
    'settings.key.space': 'Space',
    'settings.key.next': 'Next song',
    'settings.key.prev': 'Previous song',
    'settings.key.mute': 'Mute / unmute',
    'settings.profileLink': 'Nickname & avatar',
    'settings.reset': 'Reset to defaults',
    'theme.light': 'Light',
    'a11y.skip': 'Skip to content',
    'stat.songs': 'Songs',
    'stat.genres': 'Genres',
    'stat.albums': 'Albums',
    'stat.singles': 'Singles',
    'home.heading.pre': 'Published',
    'home.heading.accent': 'songs',
    'home.addRequestBtn': '+ Submit request',
    'search.placeholder': 'Search by title, artist, or album…',
    'filter.allGenres': 'All genres',
    'table.shuffle': 'Shuffle',
    'nav.wheel': 'Wheel of fortune',
    'wheel.spinBtn': 'Spin',
    'wheel.playBtn': 'Play',
    'wheel.resultLabel': 'You got:',
    'wheel.closeResult': 'Close',
    'wheel.legendTitle': 'Genres on the wheel',
    'wheel.countLabel': 'Genres on the wheel:',
    'wheel.durationLabel': 'Spin duration, sec:',
    'wheel.durationTo': '—',
    'wheel.playlistEmpty': 'Spin the wheel to build a playlist from a random genre',
    'battle.openBtn': 'Battle royale',
    'battle.setupTitle': 'Battle royale',
    'battle.chooseSize': 'Choose tournament size:',
    'battle.notEnough': 'Not enough songs in this playlist — need at least 16.',
    'battle.roundLabel': 'Contestants: ',
    'battle.vs': 'VS',
    'battle.chooseBtn': 'Pick this one',
    'battle.hoverModeBtn': 'Hover to play',
    'battle.hoverModeHint': 'Hover the video to play it — move the cursor away to pause',
    'nav.battle': 'Battle royale',
    'nav.artists': 'Artists',
    'nav.friends': 'Friends',
    'notif.bellTitle': 'Notifications',
    'notif.loading': 'Loading…',
    'notif.empty': 'No notifications yet',
    'notif.markAllRead': 'Mark all as read',
    'notif.markOneRead': 'Mark as read',
    'notif.event.songAdded': 'added a new song',
    'notif.event.songRemoved': 'removed a song',
    'notif.event.lyricsAdded': 'added lyrics for a song',
    'artists.heading.pre': 'All',
    'artists.heading.accent': 'artists',
    'artists.searchPlaceholder': 'Search for an artist…',
    'artists.empty': 'Nothing found',
    'artists.songsWord': 'songs',
    'artist.followBtn': '+ Follow',
    'artist.unfollowBtn': 'Following',
    'artist.followers': 'followers',
    'artist.discography': 'Discography',
    'artist.notFound': 'Artist not found',
    'friends.heading.pre': 'My',
    'friends.heading.accent': 'friends',
    'friends.searchPlaceholder': 'Search people by name…',
    'friends.searchEmpty': 'No one found',
    'friends.incoming': 'Incoming requests',
    'friends.incomingRequestLabel': 'wants to add you as a friend',
    'friends.outgoing': 'Sent requests',
    'friends.myFriends': 'My friends',
    'friends.incomingEmpty': 'No incoming requests',
    'friends.outgoingEmpty': 'No sent requests',
    'friends.friendsEmpty': "No friends yet — find someone using the search above",
    'friends.addBtn': '+ Add friend',
    'friends.pendingLabel': 'Request sent',
    'friends.cancelBtn': 'Cancel',
    'friends.acceptBtn': 'Accept',
    'friends.rejectBtn': 'Reject',
    'friends.unfriendBtn': 'Unfriend',
    'friends.friendsBadge': 'Friends',
    'profile.public.back': 'Back to friends',
    'profile.public.notFound': 'User not found',
    'profile.public.memberSince': 'Member since',
    'profile.public.publicPlaylistsCount': 'Public playlists',
    'profile.public.playlistsTitle': 'Public playlists',
    'profile.public.playlistsEmpty': 'No public playlists',
    'battle.heading.pre': 'Battle',
    'battle.heading.accent': 'royale',
    'battle.pageOwnHeading': 'My playlists',
    'battle.pageOwnLoginHint': 'Log in to see your own playlists here',
    'battle.pageOwnEmpty': "You don't have any playlists yet — create one in your profile",
    'battle.pagePublicHeading': 'Community playlists',
    'battle.pagePublicEmpty': 'No public playlists yet — make one of yours public in your profile',
    'battle.publicBadge': 'public',
    'battle.privateBadge': 'private',
    'battle.togglePublicHint': 'Click to toggle private/public — public playlists are visible to others on the "Battle royale" page',
    'battle.championLabel': 'Champion',
    'battle.listenToWinnerBtn': 'Listen to the champion',
    'battle.videoNotFound': 'Video not found',
    'graph.openHint': 'Show similarity graph',
    'graph.loading': 'Computing layout…',
    'graph.hint': 'Closer = more similar. Click a node to play/open it. Scroll/drag to zoom and pan.',
    'graph.titleSongs': 'Song similarity',
    'graph.titleGenres': 'Genre similarity',
    'graph.titleAlbums': 'Album similarity',
    'graph.titleSingles': 'Single similarity',
    'table.number': '#',
    'table.artist': 'Artist',
    'table.title': 'Title',
    'table.release': 'Release date',
    'table.duration': 'Duration',
    'table.genres': 'Genres',
    'table.album': 'Album',
    'table.plays': 'Plays',
    'table.action': 'Action',
    'table.empty': 'Nothing found',
    'table.single': 'Single',
    'request.heading.pre': 'Request to',
    'request.heading.accent': 'add a song',
    'request.successAlert': 'Request sent successfully! Wait for admin approval.',
    'request.submitBtn': 'Submit request',
    'extsearch.title': 'Similar songs (click to fill the form)',
    'extsearch.analyzingGenres': 'Analyzing genres…',
    'form.artist': 'Artist *',
    'form.artist.placeholder': 'Artist name',
    'form.title': 'Song title *',
    'form.title.placeholder': 'Song title',
    'form.release': 'Release date *',
    'form.duration': 'Duration *',
    'form.duration.hint': 'Additionally: 31 (sec), 211 = 3:31 (min:sec)',
    'form.album': 'Album (optional)',
    'form.album.placeholder': 'Album name, or leave empty for a single',
    'form.genres': 'Genres *',
    'form.genres.placeholder': 'Rock, Pop, Jazz',
    'form.genres.hint': 'Comma-separated',
    'admin.heading.pre': 'Requests',
    'admin.heading.accent': 'from users',
    'admin.empty': 'No new requests',
    'admin.approveBtn': 'Approve',
    'admin.rejectBtn': 'Reject',
    'admin.editBtn': 'Edit',
    'admin.editTitle': 'Edit request',
    'admin.saveBtn': 'Save',
    'msg.errorEditRequest': 'Error saving changes',
    'admin.editSongTitle': 'Edit song',
    'admin.youtubeVideo': 'YouTube video (optional)',
    'admin.youtubeVideo.placeholder': 'Video ID or link, or leave empty',
    'admin.youtubeVideo.hint': "The auto-picked, cached video can be replaced or cleared here if it turned out to be the wrong one",
    'admin.youtubeVideo.view': 'View on YouTube',
    'admin.lyrics': 'Song lyrics (optional)',
    'admin.lyrics.placeholder': 'Paste the lyrics line by line, or leave empty',
    'admin.normalizeGenresBtn': 'Merge duplicate genres',
    'admin.normalizeGenresRunning': 'Checking…',
    'admin.normalizeGenresNone': 'No duplicates found — all genres are unique.',
    'admin.normalizeGenresError': 'Could not reach the AI (check your Gemini key):',
    'admin.normalizeGenresDone': 'Groups merged: {count}',
    'msg.errorNormalizeGenres': 'Error merging genres',
    'msg.errorEditSong': 'Error saving song',
    'add.heading.pre': 'Add a',
    'add.heading.accent': 'new song',
    'add.successAlert': 'Song successfully added to the database!',
    'add.submitBtn': 'Add to database',
    'page.title': "N'Owl",
    'player.shuffle': 'Shuffle',
    'player.prev': 'Previous',
    'player.next': 'Next',
    'player.repeat': 'Repeat',
    'player.video': 'Open video',
    'player.karaoke': 'Lyrics',
    'player.karaokeEmpty': 'No lyrics for this song yet',
    'player.editSong': 'Edit song',
    'player.close': 'Close',
    'videoPopup.title': 'Video',
    'videoPopup.loading': 'Loading…',
    'videoPopup.expand': 'Expand',
    'videoPopup.fullscreen': 'Fullscreen',
    'videoPopup.popout': 'Move to separate window',
    'video.notFoundSuffix': ' — video not found',
    'modal.deleteTitle': 'Delete song?',
    'modal.deleteBodyTemplate': 'The song "{label}" will be permanently deleted from the database.',
    'modal.deleteDefaultLabel': 'this song',
    'modal.cancel': 'Cancel',
    'modal.confirmDelete': 'Delete',
    'auth.logout': 'Log out',
    'auth.loginBtn': 'Sign in with Google',
    'msg.confirmLoginForRequest': 'You need to sign in with Google to submit a request. Go to login?',
    'msg.confirmLoginGeneric': 'You need to sign in with Google to continue. Go to login?',
    'nav.recommendations': 'Recommended for you',
    'nav.profile': 'Profile',
    'nav.profileSettings': 'Settings',
    'profileSettings.heading.pre': 'Profile',
    'profileSettings.heading.accent': 'settings',
    'profile.heading.pre': 'My',
    'profile.heading.accent': 'profile',
    'profile.displayName': 'Nickname',
    'profile.avatar': 'Profile image',
    'profile.avatarHint': 'Choose an image from your device',
    'profile.avatarRemove': 'remove and restore Google photo',
    'profile.displayName.placeholder': 'e.g. MusicLover',
    'profile.saveBtn': 'Save',
    'profile.totalListened': 'Listened',
    'profile.favoritesCount': 'Favorites',
    'profile.playlistsCount': 'Playlists',
    'profile.topGenres': 'Favorite genres',
    'profile.favoritesTitle': 'Favorite songs',
    'profile.favoritesEmpty': 'No favorite songs yet',
    'profile.playlistsTitle': 'My playlists',
    'profile.newPlaylistBtn': '+ New playlist',
    'profile.playlistsEmpty': 'No playlists yet',
    'profile.backToProfile': 'Back to profile',
    'profile.playlistEmpty': 'This playlist has no songs yet',
    'profile.playBtn': 'Play',
    'profile.playAllBtn': 'Play playlist',
    'profile.favToggle': 'Favorite',
    'player.addToPlaylist': 'Add to playlist',
    'profile.songsWord': 'songs',
    'profile.newPlaylistPrompt': 'New playlist name:',
    'profile.newPlaylistPublicConfirm': 'Make this playlist public? Other users will be able to see and use it on the "Battle royale" page (nowhere else on the site). Cancel keeps it private, as usual.',
    'profile.addToPlaylist': 'Add to playlist',
    'profile.addToPlaylistTitle': 'Add to playlist',
    'profile.newPlaylistPlaceholder': 'New playlist name',
    'profile.createAndAddBtn': 'Create & add',
    'rec.heading.pre': 'Recommended',
    'rec.heading.accent': 'for you',
    'rec.loading': 'Finding recommendations…',
    'rec.empty': 'Listen to a few songs to get personal recommendations',
    'msg.needLoginForRequest': 'You need to sign in with Google to submit a request.',
    'msg.fillRequiredFields': 'Please fill in all required fields (*)',
    'msg.needLoginGeneric': 'You need to sign in with Google',
    'msg.errorSubmittingRequest': 'Error submitting the request',
    'msg.connectionError': 'Server connection error',
    'msg.errorApprove': 'Error approving the request',
    'msg.approveMerged': 'This song already exists — new genres were added to the existing entry.',
    'msg.needLoginAdmin': 'You need to sign in as admin',
    'msg.errorDelete': 'Deletion error',
    'msg.errorReject': 'Rejection error',
    'msg.needAdminRights': 'Admin rights required',
    'msg.errorAddSong': 'Error adding the song',
    'nav.community': 'Community songs',
    'nav.discussions': 'Discussions',
    'nav.messages': 'Messages',
    'navSearch.placeholder': 'Songs, artists, people…',
    'navSearch.songs': 'Songs',
    'navSearch.artists': 'Artists',
    'navSearch.users': 'People',
    'navSearch.empty': 'Nothing found',
    'navSearch.loginForUsers': 'Sign in to search for people',
    'home.source.catalog': 'Catalog',
    'home.source.community': 'Community',
    'home.communityHint': 'Original songs by community members — uploaded as a file or linked from YouTube.',
    'home.heading.communityPre': 'Songs from the',
    'home.heading.communityAccent': 'community',
    'home.addOwnSongBtn': '+ Add your song',
    'table.rating': 'Rating',
    'table.submittedBy': 'Added by',
    'table.source': 'Table',
    'table.communityEmpty': 'No community songs yet — be the first to add yours',
    'request.kind.catalog': 'Song for the catalog',
    'request.kind.community': 'My own song (community)',
    'form.audioFile': 'Song file',
    'form.audioFile.hint': 'MP3, M4A, OGG, WAV, FLAC — up to 25 MB. Optional if a YouTube video is given.',
    'form.youtube': 'YouTube video link',
    'admin.audioReplaceHint': 'Choose a file to replace the current one',
    'msg.communityNeedsFileOrVideo': 'Add a song file or a YouTube video link.',
    'msg.audioTooLarge': 'The file is larger than 25 MB.',
    'msg.uploading': 'Uploading…',
    'audio.notFoundSuffix': ' — file unavailable',
    'adminNotif.sectionTitle': 'Administration',
    'notif.sectionTitle': 'Follows & friends',
    'adminNotif.someone': 'Someone',
    'adminNotif.request_submitted': 'submitted a request',
    'adminNotif.request_approved': 'approved a request',
    'adminNotif.request_rejected': 'rejected a request',
    'adminNotif.song_added': 'added',
    'chat.heading.pre': 'Community',
    'chat.heading.accent': 'chat',
    'chat.tab.dm': 'Direct messages',
    'chat.tab.threads': 'Discussions',
    'chat.loginHint': 'Sign in to send messages',
    'chat.newHint': 'Start a new conversation via people search above or the “Message” button on a profile.',
    'chat.noConversations': 'No conversations yet',
    'chat.pickConversation': 'Pick a conversation on the left',
    'chat.inputPlaceholder': 'Write a message… (Enter to send, Shift+Enter for a new line)',
    'chat.sendBtn': 'Send',
    'chat.writeBtn': 'Message',
    'chat.you': 'You',
    'chat.newConversation': 'New conversation',
    'chat.startConversation': 'Write the first message',
    'threads.searchPlaceholder': 'Search threads…',
    'threads.newBtn': '+ New thread',
    'threads.titleLabel': 'Topic *',
    'threads.bodyLabel': 'Message *',
    'threads.createBtn': 'Create thread',
    'threads.empty': 'No discussions yet — start the first one',
    'threads.back': 'All discussions',
    'threads.loginToReply': 'Sign in to reply',
    'threads.replyPlaceholder': 'Your reply…',
    'threads.replyBtn': 'Reply',
    'threads.deletedUser': 'deleted user',
    'threads.by': 'by',
    'threads.lastActivity': 'active:',
    'threads.confirmDeleteThread': 'Delete this thread with all replies?',
    'threads.confirmDeletePost': 'Delete this reply?',
    'rating.title': 'Rate the song',
    'rating.yourScore': 'Your score (0–100)',
    'rating.review': 'Review (optional)',
    'rating.reviewPlaceholder': 'What worked, what didn’t…',
    'rating.deleteBtn': 'Remove rating',
    'rating.loginHint': 'Sign in to rate the song and write a review',
    'rating.reviewsTitle': 'Reviews',
    'rating.rateBtn': 'Rate',
    'rating.summary': 'Average score: {avg} / 100 · ratings: {count}',
    'rating.noRatings': 'No ratings yet',
    'rating.noReviews': 'No reviews yet',
    'rating.confirmAdminDelete': 'Delete this user\'s rating and review?',
    'chat.tab.requests': 'Message requests',
    'chat.requestsHint': 'Friends message you directly. Other people can send one message — the conversation opens only if you accept the request.',
    'chat.requestsEmpty': 'No new message requests',
    'chat.acceptRequest': 'Accept',
    'chat.declineRequest': 'Decline',
    'chat.pendingLabel': 'request sent',
    'chat.state.none': 'You are not friends yet — your first message will arrive as a message request. You can keep writing once it is accepted.',
    'chat.state.pendingOutgoing': 'Message request sent. You can write more once it is accepted.',
    'chat.state.declined': 'This person declined your message request.',
    'chat.state.pendingIncoming': 'This is a message request. Replying accepts it automatically.',
    'battle.communityTrack': 'Community track'
  }
};
let currentLang = localStorage.getItem('lang') || 'uk';
function t(key){ return (I18N[currentLang] && I18N[currentLang][key]) || key; }
function applyLang(lang){
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{ el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = t(el.getAttribute('data-i18n-title')); });
  const label = document.getElementById('lang-toggle-label');
  if(label) label.textContent = lang === 'uk' ? 'UA' : 'EN';
  document.querySelectorAll('#lang-dropdown [data-lang-option]').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-lang-option') === lang);
  });
  document.title = t('page.title');
  // Динамічний контент без data-i18n треба перемалювати наново при зміні мови.
  renderSongs();
  updateStats();
  renderAuthArea();
  if(currentUser?.isAdmin) renderRequests();
  // Рекомендації генерує ШІ мовою фронтенду — якщо сторінка відкрита, перезапитуємо новою мовою.
  if(document.getElementById('page-recommendations')?.classList.contains('active')) loadRecommendationsPage();
  if(document.getElementById('page-top')?.classList.contains('active')) loadTopSongsPage();
  if(document.getElementById('page-profile')?.classList.contains('active')) loadProfilePage();
  if(document.getElementById('page-playlist')?.classList.contains('active') && currentPlaylistId!=null) openPlaylist(currentPlaylistId);
  if(document.getElementById('page-artists')?.classList.contains('active')) loadArtistsPage();
  if(document.getElementById('page-artist')?.classList.contains('active') && currentArtistId!=null) loadArtistPage();
  if(document.getElementById('page-friends')?.classList.contains('active')){
    loadFriendsPage();
    if(document.getElementById('friends-search')?.value.trim()) runFriendsSearch();
  }
  if(document.getElementById('page-user-profile')?.classList.contains('active') && currentProfileUserId!=null) loadUserProfilePage();
  if(document.getElementById('page-battle')?.classList.contains('active')) openBattlePage();
  if(wheelResultGenre && document.getElementById('page-wheel')?.classList.contains('active')) renderWheelPlaylist();
  if(document.getElementById('notif-dropdown')?.classList.contains('open')) onOpenNotifDropdown();
  _applyHomeSourceUi();
  if(document.getElementById('page-chat')?.classList.contains('active')) loadChatPage();
  if(document.getElementById('rating-modal-overlay')?.classList.contains('open') && ratingMusicId!=null) _loadRatingModal();
  syncSettingsUI();
}
function selectLang(lang){
  applyLang(lang);
}

// ================================================================
// DROPDOWNS (тема / мова)
// ================================================================
function toggleDropdown(evt, id){
  evt.stopPropagation();
  document.querySelectorAll('.dropdown.open').forEach(d=>{ if(d.id !== id) d.classList.remove('open'); });
  document.getElementById(id).classList.toggle('open');
}
document.addEventListener('click', (e)=>{
  document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
  if(!e.target.closest('#nav-search')) _hideNavSearch();
});

let songs = [];          // головна таблиця_1 (каталог)
let communitySongs = []; // головна таблиця_2 (пісні від ком'юніті)
let homeSource = 'catalog';
let requests = [];
// Пісні таблиці, що зараз відкрита на "Головній".
function activeSongs(){ return homeSource === 'community' ? communitySongs : songs; }
// Пошук пісні в обох таблицях — для модалок редагування/видалення/оцінки.
function _findSong(id){
  return songs.find(x=>x.id===id) || communitySongs.find(x=>x.id===id)
    || playerQueue.find(x=>x.id===id) || currentTopSongs.find(x=>x.id===id) || null;
}

// ================================================================
// NAVIGATION
// ================================================================
function showPage(n){
  const doSwitch = () => {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-menu-item, #tab-home').forEach(b=>b.classList.remove('active'));
    document.getElementById('page-'+n).classList.add('active');
    // Таблиця_2 живе на тій самій сторінці "Головна" — підсвічуємо її пункт меню.
    const tab = document.getElementById(n==='home' && homeSource==='community' ? 'tab-community' : 'tab-'+n);
    if(tab) tab.classList.add('active');
  };
  _hideNavSearch();
  document.documentElement.setAttribute('data-page', n);
  // View Transitions API — нативний крос-фейд між сторінками (Chrome/Edge,
  // а отже й Electron). Без підтримки (Firefox/Safari) просто миттєво
  // перемикає, як і раніше — жодного regressions, лише бонус там, де є.
  if(document.startViewTransition && !_reducedMotion()) document.startViewTransition(doSwitch);
  else doSwitch();
  // Важкий перерендер відкладаємо на наступний кадр — інакше перехід між сторінками виглядає як підвисання.
  requestAnimationFrame(()=>{
    if(n==='home'){renderSongs();updateStats().catch(console.error);}
    if(n==='top') loadTopSongsPage();
    if(n==='admin-hub'){ switchAdminHubTab('requests'); renderRequests(); }
    if(n==='profile') loadProfilePage();
    if(n==='profile-settings') loadProfileSettingsPage();
    if(n==='recommendations') loadRecommendationsPage();
    if(n==='wheel') openWheelPage();
    if(n==='battle') openBattlePage();
    if(n==='artists') loadArtistsPage();
    if(n==='artist') loadArtistPage();
    if(n==='friends') loadFriendsPage();
    if(n==='user-profile') loadUserProfilePage();
    if(n==='settings') loadSettingsPage();
    if(n==='chat') loadChatPage();
  });
}
// ================================================================
// RENDER SONGS
// ================================================================
let shuffleActive = false;
let shuffleOrderMap = new Map();
let sortKey = null;
let sortDir = 1;
let displayedSongs = [];

function sortSongs(key){
  if(sortKey===key){ sortDir=-sortDir; }
  else { sortKey=key; sortDir=1; }
  if(shuffleActive){
    shuffleActive=false;
    shuffleOrderMap=new Map();
    document.getElementById('shuffle-table-btn').classList.remove('active');
  }
  document.querySelectorAll('th.sortable').forEach(th=>{
    th.classList.remove('sort-asc','sort-desc');
    if(th.getAttribute('data-sort-key')===sortKey) th.classList.add(sortDir>0?'sort-asc':'sort-desc');
  });
  renderSongs();
}

function _sortVal(s, key){
  switch(key){
    case 'genres': return s.genres.length?s.genres[0].toLowerCase():'';
    case 'album': return (s.album||'').toLowerCase();
    case 'plays': return s.playCount ?? 0;
    case 'rating': return s.avgRating ?? -1;
    case 'submitter': return (s.submittedBy?.displayName || '').toLowerCase();
    case 'artist': case 'title': return s[key].toLowerCase();
    default: return s[key];
  }
}
// Порівняння текстів для сортування — приводить до нижнього регістру, інакше
// великі й малі літери сортуються окремими блоками замість "Aa, Бб...".
function _textSortCmp(a, b){
  const la = String(a).toLowerCase(), lb = String(b).toLowerCase();
  return la < lb ? -1 : la > lb ? 1 : 0;
}
// ================================================================
// АДМІН: ШІ-об'єднання дублікатів жанрів (POST /api/genres/normalize)
// ================================================================
function normalizeGenres(){
  const btn = document.getElementById('normalize-genres-btn');
  const originalHtml = btn.innerHTML; // innerHTML, не textContent — кнопка тепер містить ще й <svg class="icon">
  btn.disabled = true;
  btn.textContent = t('admin.normalizeGenresRunning');

  fetch('/api/genres/normalize', { method: 'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.errorNormalizeGenres')); return null; }
      return r.json();
    })
    .then(data=>{
      if(!data) return;
      if(data.error){
        alert(t('admin.normalizeGenresError') + '\n\n' + data.error);
      } else if(data.mergedCount === 0){
        alert(t('admin.normalizeGenresNone'));
      } else {
        alert(t('admin.normalizeGenresDone').replace('{count}', data.mergedCount) + '\n\n' + data.mergedPairs.join('\n'));
      }
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>{ btn.disabled = false; btn.innerHTML = originalHtml; });
}

// ================================================================
// FAVORITES (улюблені пісні) — доступно будь-якому авторизованому
// ================================================================
let favoriteIds = new Set();
function loadFavoriteIds(){
  fetch('/api/favorites').then(r=>r.ok?r.json():[]).then(list=>{
    favoriteIds = new Set(list.map(s=>s.id));
    renderSongs();
  }).catch(()=>{});
}
function toggleFavorite(musicId, btn){
  const isFav = favoriteIds.has(musicId);
  const method = isFav ? 'DELETE' : 'POST';
  fetch(`/api/favorites/${musicId}`, { method })
    .then(r=>{
      if(!r.ok) return;
      if(isFav) favoriteIds.delete(musicId); else favoriteIds.add(musicId);
      if(btn){
        btn.classList.toggle('active', !isFav);
        const svg = btn.querySelector('svg');
        if(svg) svg.setAttribute('fill', !isFav ? 'currentColor' : 'none');
      }
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// PROFILE (профіль, улюблені, плейлисти)
// ================================================================
let profileAvatarValue = null;   // поточне значення аватарки, яке буде надіслано при збереженні
let profileGooglePicture = null; // фото з Google-акаунту (фолбек, якщо своєї аватарки нема)
function loadProfilePage(){
  fetch('/api/profile').then(r=>r.json()).then(p=>{
    document.getElementById('profile-view-name').textContent = p.displayName || p.name || p.email;
    document.getElementById('profile-view-email').textContent = p.email;
    const shownPic = p.avatarUrl || p.picture;
    const picEl = document.getElementById('profile-view-picture');
    const picPh = document.getElementById('profile-view-picture-ph');
    if(shownPic){ picEl.src = shownPic; picEl.style.display = ''; picPh.style.display = 'none'; }
    else { picEl.style.display = 'none'; picPh.style.display = ''; }
    document.getElementById('profile-stat-listened').textContent = p.totalListened;
    document.getElementById('profile-stat-favorites').textContent = p.favoritesCount;
    document.getElementById('profile-stat-playlists').textContent = p.playlistsCount;

    const genresWrap = document.getElementById('profile-top-genres-wrap');
    if(p.topGenres && p.topGenres.length){
      document.getElementById('profile-top-genres').innerHTML = p.topGenres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
      genresWrap.style.display = 'block';
    } else genresWrap.style.display = 'none';
  }).catch(()=>{});

  loadProfileFavorites();
  loadProfilePlaylists();
}
// Раніше було частиною loadProfilePage() — виділено окремо, коли
// редагування нікнейму/аватарки переїхало на свою сторінку "Налаштування".
function loadProfileSettingsPage(){
  fetch('/api/profile').then(r=>r.json()).then(p=>{
    document.getElementById('profile-name').textContent = p.displayName || p.name || p.email;
    document.getElementById('profile-email').textContent = p.email;
    document.getElementById('profile-display-name').value = p.displayName || '';
    profileAvatarValue = p.avatarUrl || null;
    profileGooglePicture = p.picture || null;
    const pic = document.getElementById('profile-picture');
    const shown = p.avatarUrl || p.picture;
    if(shown){ pic.src = shown; pic.style.display = 'block'; } else pic.style.display = 'none';
  }).catch(()=>{});
}
// Конвертує обрану аватарку в base64 для прев'ю; надсилається лише при "Зберегти".
function onAvatarFileSelected(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    profileAvatarValue = reader.result;
    const pic = document.getElementById('profile-picture');
    pic.src = profileAvatarValue;
    pic.style.display = 'block';
  };
  reader.readAsDataURL(file);
}
function removeAvatar(){
  profileAvatarValue = null;
  document.getElementById('profile-avatar-file').value = '';
  const pic = document.getElementById('profile-picture');
  if(profileGooglePicture){ pic.src = profileGooglePicture; pic.style.display = 'block'; }
  else pic.style.display = 'none';
}
function saveProfile(){
  const displayName = document.getElementById('profile-display-name').value.trim();
  fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ displayName: displayName || null, avatarUrl: profileAvatarValue }) })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      if(currentUser){ currentUser.displayName = displayName || null; currentUser.avatarUrl = profileAvatarValue; }
      loadProfileSettingsPage();
      renderAuthArea();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function loadProfileFavorites(){
  fetch('/api/favorites').then(r=>r.json()).then(list=>{
    const tbody = document.getElementById('profile-favorites-body');
    document.getElementById('profile-favorites-empty').style.display = list.length ? 'none' : '';
    tbody.innerHTML = list.map(s=>`
      <tr>
        <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
        <td data-label="${t('table.title')}">${esc(s.title)}</td>
        <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        <td class="td-icon-trail" data-label=""><button class="btn-icon-fav active" onclick="removeFavoriteFromProfile(${s.id})" title="${t('profile.favToggle')}"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></button></td>
      </tr>`).join('');
  }).catch(()=>{});
}
function removeFavoriteFromProfile(musicId){
  fetch(`/api/favorites/${musicId}`, { method:'DELETE' }).then(()=>{
    favoriteIds.delete(musicId);
    loadProfileFavorites();
    loadProfilePage();
  }).catch(()=>{});
}
function loadProfilePlaylists(){
  fetch('/api/playlists').then(r=>r.json()).then(list=>{
    document.getElementById('profile-playlists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('profile-playlists-list').innerHTML = list.map(p=>`
      <div class="ext-search-item" onclick="openPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
        <div style="display:flex;align-items:center;gap:8px;" onclick="event.stopPropagation()">
          <button type="button" class="btn btn-outline${p.isPublic?' active':''}" style="font-size:0.7rem;padding:0.3rem 0.7rem;" onclick="togglePlaylistPublic(${p.id}, ${p.isPublic ? 'false' : 'true'})" title="${t('battle.togglePublicHint')}">${p.isPublic ? `<svg class="icon"><use href="#icon-globe"/></svg> ${esc(t('battle.publicBadge'))}` : `<svg class="icon"><use href="#icon-lock"/></svg> ${esc(t('battle.privateBadge'))}`}</button>
          <button class="btn-icon-danger" onclick="deletePlaylist(${p.id})" title="${t('modal.confirmDelete')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
          </button>
        </div>
      </div>`).join('');
  }).catch(()=>{});
}
function createPlaylist(){
  const name = prompt(t('profile.newPlaylistPrompt'));
  if(!name || !name.trim()) return;
  // Публічний плейлист видно іншим на сторінці "Батл рояль"; за замовчуванням — приватний.
  const isPublic = confirm(t('profile.newPlaylistPublicConfirm'));
  fetch('/api/playlists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: name.trim(), isPublic }) })
    .then(r=>{ if(r.ok) loadProfilePlaylists(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deletePlaylist(id){
  fetch(`/api/playlists/${id}`, { method:'DELETE' }).then(()=>loadProfilePlaylists()).catch(()=>{});
}
// Перемикач публічності — окремою кнопкою на кожному плейлисті, а не лише при створенні.
function togglePlaylistPublic(id, makePublic){
  fetch(`/api/playlists/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ isPublic: makePublic }) })
    .then(r=>{ if(r.ok) loadProfilePlaylists(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ADD TO PLAYLIST (з головної таблиці — кнопка "➕")
// ================================================================
let addToPlaylistMusicId = null;
function openAddToPlaylistModal(musicId){
  addToPlaylistMusicId = musicId;
  document.getElementById('add-to-playlist-new-name').value = '';
  fetch('/api/playlists').then(r=>r.json()).then(list=>{
    const wrap = document.getElementById('add-to-playlist-list');
    document.getElementById('add-to-playlist-empty').style.display = list.length ? 'none' : '';
    wrap.innerHTML = list.map(p=>`
      <div class="ext-search-item" onclick="addSongToExistingPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
      </div>`).join('');
    document.getElementById('add-to-playlist-modal-overlay').classList.add('open');
  }).catch(()=>{ alert(t('msg.connectionError')); });
}
// Симетричний вихід для всіх модалок сайту: додає .closing (запускає
// modalOut-анімацію через CSS), і лише після її завершення знімає .open —
// без цього display:none спрацював би миттєво, а анімація не встигла б програтись.
function _closeModalAnimated(overlayId){
  const overlay = document.getElementById(overlayId);
  if(!overlay || !overlay.classList.contains('open')) return;
  overlay.classList.add('closing');
  setTimeout(() => overlay.classList.remove('open', 'closing'), 200);
}

function closeAddToPlaylistModal(){
  _closeModalAnimated('add-to-playlist-modal-overlay');
  addToPlaylistMusicId = null;
}
document.getElementById('add-to-playlist-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeAddToPlaylistModal();
});
function addSongToExistingPlaylist(playlistId){
  if(!addToPlaylistMusicId) return;
  fetch(`/api/playlists/${playlistId}/songs/${addToPlaylistMusicId}`, { method:'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      closeAddToPlaylistModal();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function createPlaylistAndAdd(){
  const name = document.getElementById('add-to-playlist-new-name').value.trim();
  if(!name){ alert(t('msg.fillRequiredFields')); return; }
  fetch('/api/playlists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
    .then(r=>r.ok?r.json():null)
    .then(playlist=>{
      if(!playlist){ alert(t('msg.connectionError')); return; }
      return addSongToExistingPlaylist(playlist.id);
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
let currentPlaylistId = null;
function openPlaylist(id){
  currentPlaylistId = id;
  fetch(`/api/playlists/${id}`).then(r=>r.json()).then(p=>{
    currentPlaylistSongs = p.songs;
    document.getElementById('playlist-detail-title').textContent = p.name;
    const tbody = document.getElementById('playlist-detail-body');
    document.getElementById('playlist-detail-empty').style.display = p.songs.length ? 'none' : '';
    document.getElementById('playlist-play-all-btn').style.display = p.songs.length ? '' : 'none';
    tbody.innerHTML = p.songs.map(s=>`
      <tr>
        <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromPlaylist)" title="${t('profile.playBtn')}">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
        </button></td>
        <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
        <td data-label="${t('table.title')}">${esc(s.title)}</td>
        <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        <td class="td-icon-trail" data-label=""><button class="btn-icon-danger" onclick="removeSongFromPlaylist(${id},${s.id})" title="${t('modal.confirmDelete')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
        </button></td>
      </tr>`).join('');
    showPage('playlist');
  }).catch(()=>{});
}
function removeSongFromPlaylist(playlistId, musicId){
  fetch(`/api/playlists/${playlistId}/songs/${musicId}`, { method:'DELETE' }).then(()=>openPlaylist(playlistId)).catch(()=>{});
}

// ================================================================
// RECOMMENDATIONS
// ================================================================
function openRecommendationsPage(){
  if(!currentUser?.authenticated){
    if(confirm(t('msg.confirmLoginGeneric'))) login();
    return;
  }
  showPage('recommendations');
}
function loadRecommendationsPage(){
  document.getElementById('rec-loading').style.display = 'block';
  document.getElementById('rec-empty').style.display = 'none';
  document.getElementById('rec-list').innerHTML = '';

  fetch(`/api/recommendations?lang=${encodeURIComponent(currentLang)}`).then(r=>r.json()).then(list=>{
    document.getElementById('rec-loading').style.display = 'none';
    if(!list.length){ document.getElementById('rec-empty').style.display = ''; return; }
    document.getElementById('rec-list').innerHTML = list.map(item=>{
      const s = item.song;
      return `
      <div class="rec-item" onclick="playSong(${s.id})">
        <div class="rec-main">
          <strong>${esc(s.artist)}</strong>
          <span class="rec-title">${esc(s.title)}</span>
          ${item.reason?`<span class="rec-reason">${esc(item.reason)}</span>`:''}
        </div>
        <div class="es-meta">
          ${s.genres.map(g=>`<span class="es-genre-badge">${esc(abbrGenre(g))}</span>`).join('')}
        </div>
      </div>`;
    }).join('');
  }).catch(()=>{
    document.getElementById('rec-loading').style.display = 'none';
  });
}

function toggleShuffleTable(){
  shuffleActive = !shuffleActive;
  const btn = document.getElementById('shuffle-table-btn');
  if(shuffleActive){
    const ids = activeSongs().map(s=>s.id);
    for(let i=ids.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    shuffleOrderMap = new Map(ids.map((id,idx)=>[id, idx]));
    btn.classList.add('active');
  } else {
    shuffleOrderMap = new Map();
    btn.classList.remove('active');
  }
  renderSongs();
}

// ================================================================
// КОЛЕСО ФОРТУНИ: випадковий жанр -> перемішаний плейлист цього жанру
// (окрема сторінка page-wheel, а не модалка — відкривається через showPage('wheel'))
// ================================================================
// Приглушена, "коштовна" палітра в тон золотому акценту сайту — замість
// яскравих іграшкових кольорів звичайного колеса фортуни.
const WHEEL_COLORS = [
  '#c8a96e','#8a6fb0','#4f8c6f','#b5555a','#5b84a8','#c98a4b',
  '#6fa89e','#9a6b8f','#7d9153','#b0703f','#5f6fa0','#a3824f',
];
// wheelAllGenres — весь пул, перемішаний раз при відкритті; wheelGenres — перші N з нього.
// Зміна кількості обрізає той самий порядок, а не перемішує наново.
let wheelAllGenres = [];
let wheelGenres = [];
let wheelResultGenre = null;
let wheelSpinning = false;
let currentWheelSongs = [];

function _shuffledCopy(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Колір сегмента: до 10 жанрів — підібрана палітра; більше — HSL за "золотим кутом"
// (~137.5°), щоб сусідні сектори не зливались, як при звичайному i/n*360.
function _wheelSegColor(i, n){
  if(n <= WHEEL_COLORS.length) return WHEEL_COLORS[i % WHEEL_COLORS.length];
  // Приглушено (38%/42%), узгоджено з кураторською палітрою вище.
  return `hsl(${Math.round((i*137.508) % 360)}deg 38% 42%)`;
}

// Жанр бере участь у колесі лише якщо в ньому є щонайменше 5 пісень — інакше
// плейлист по цьому жанру виходив би заскладно коротким.
function _eligibleWheelGenres(){
  const counts = {};
  for(const s of songs) for(const g of s.genres) counts[g] = (counts[g] || 0) + 1;
  return Object.keys(counts).filter(g => counts[g] >= 5);
}

// true лише після того, як користувач сам змінив поле (onWheelCountChange) —
// без цього прапорця openWheelPage() щоразу бачив у полі вже НЕПОРОЖНЄ (хай і
// дефолтне з HTML) значення "2" і ніколи не підставляв нормальний дефолт 10.
let wheelCountTouched = false;

function openWheelPage(){
  wheelAllGenres = _shuffledCopy(_eligibleWheelGenres());
  const countInput = document.getElementById('wheel-count');
  const total = wheelAllGenres.length;
  countInput.max = total || 1;
  // За замовчуванням — досить мало, щоб підписи одразу читались; хочете
  // більше (аж до всіх жанрів бази) — підкрутіть число самі.
  countInput.min = Math.min(2, total || 1);
  const defaultCount = Math.max(1, Math.min(10, total));
  countInput.value = wheelCountTouched
    ? Math.min(Math.max(countInput.min, parseInt(countInput.value) || defaultCount), total || 1)
    : defaultCount;
  document.getElementById('wheel-count-max').textContent = `/ ${total}`;
  _applyWheelCount();
  wheelResultGenre = null;
  wheelSpinning = false;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-disc').classList.remove('revealed');
  document.getElementById('wheel-spin-btn').disabled = false;
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';
}

// Хрестик на картці результату — ховає її й миттєво знімає розмиття з диска
// (сам .wheel-disc.revealed прибирає filter з transition саме для цього).
function closeWheelResult(){
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-disc').classList.remove('revealed');
}

// Викликається при зміні поля "Кількість жанрів на колесі" — обрізає той
// самий перемішаний пул і перемальовує колесо (без нового спіну/результату).
function onWheelCountChange(){
  if(wheelSpinning) return;
  wheelCountTouched = true;
  const countInput = document.getElementById('wheel-count');
  const total = wheelAllGenres.length;
  const min = parseInt(countInput.min) || 1;
  if(_sanitizeIntInput(countInput, min, total || 1) === null) return; // ще друкує/порожньо
  _applyWheelCount();
  wheelResultGenre = null;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-disc').classList.remove('revealed');
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';
}
function _applyWheelCount(){
  const v = parseInt(document.getElementById('wheel-count').value) || wheelAllGenres.length;
  wheelGenres = wheelAllGenres.slice(0, v);
  renderWheelDisc();
  renderWheelLegend();
  const disc = document.getElementById('wheel-disc');
  disc.style.transition = 'none';
  disc.style.transform = 'rotate(0deg)';
  requestAnimationFrame(()=>{ disc.style.transition = ''; });
}

// Розмір шрифту підписів масштабуємо під кількість секторів — інакше текст накладається сам на себе.
function _wheelLabelFontSize(n){
  if(n <= 8) return 14;
  if(n <= 16) return 12.5;
  if(n <= 28) return 11;
  if(n <= 45) return 9.8;
  if(n <= 65) return 8.8;
  return 8;
}

// Підписи позиціонуються окремо від фарбування диска й перемальовуються через
// ResizeObserver (не одноразово в renderWheelDisc) — clientWidth диска одразу
// після showPage()/View Transition не завжди встигає влаштуватись на фінальний
// розмір (звідси стійкий баг "підписи впритул до хаба", що повертався попри
// правильну формулу — сама формула рахувала на ЗАНИЖЕНОМУ discR). ResizeObserver
// гарантовано спрацює ще раз, щойно диск отримає свій справжній розмір.
let _wheelDiscResizeObserver = null;
function renderWheelDisc(){
  const disc = document.getElementById('wheel-disc');
  const n = wheelGenres.length;
  if(!n){ disc.style.background = ''; disc.innerHTML = ''; return; }
  const segAngle = 360/n;
  const gradientParts = wheelGenres.map((g,i)=>`${_wheelSegColor(i,n)} ${i*segAngle}deg ${(i+1)*segAngle}deg`).join(', ');
  disc.style.background = `conic-gradient(${gradientParts})`;
  _renderWheelLabels(disc);
  if(!_wheelDiscResizeObserver){
    _wheelDiscResizeObserver = new ResizeObserver(() => _renderWheelLabels(disc));
    _wheelDiscResizeObserver.observe(disc);
  }
}
function _renderWheelLabels(disc){
  const n = wheelGenres.length;
  if(!n) return;
  const segAngle = 360/n;
  // "По центру сектора" — кутове центрування (mid, бісектриса сектора), не радіальне.
  const hubR = (document.getElementById('wheel-hub')?.clientWidth || 0)/2;
  const discR = disc.clientWidth/2;
  if(!discR) return; // диск ще без розміру (0 у момент переходу сторінки) — дочекаємось ResizeObserver
  const startR = Math.max(hubR + 28, discR*0.62);
  const fontSize = _wheelLabelFontSize(n);
  disc.innerHTML = wheelGenres.map((g,i)=>{
    const mid = i*segAngle + segAngle/2;
    // rotate(θ) translate(r,0) дивиться на кут (90+θ) від верху — щоб отримати mid, беремо θ = mid-90.
    const rot = mid - 90;
    return `<span class="wheel-seg-label" style="font-size:${fontSize}px;transform:rotate(${rot}deg) translate(${startR}px, 0);">${esc(abbrGenre(g))}</span>`;
  }).join('');
}

// Легенда — той самий список назв, що й на диску, але списком, для звірки з обрізаними підписами.
function renderWheelLegend(){
  const n = wheelGenres.length;
  document.getElementById('wheel-legend').innerHTML = wheelGenres.map((g,i)=>`
    <div class="wheel-legend-item" id="wheel-legend-item-${i}">
      <span class="wheel-legend-swatch" style="background:${_wheelSegColor(i,n)}"></span>
      <span>${esc(g)}</span>
    </div>`).join('');
}

// Санітайзер для числових полів колеса (type="text", бо type="number" пропускає
// невалідний проміжний ввід): викидає нецифрові символи, затискає ЛИШЕ зверху
// (max) під час друку. Нижню межу (min) тут НЕ підіймаємо — інакше перша
// цифра нижче min (напр. "1" при min=2) миттєво перетворювалась би на "2" ще
// до того, як дописати другу цифру, і "12" ніколи не вдавалось би ввести.
// Нижню межу перевіряємо остаточно на blur — _restoreIntInputIfEmpty.
function _sanitizeIntInput(el, min, max){
  const digitsOnly = el.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if(digitsOnly === ''){
    if(el.value !== '') el.value = '';
    return null;
  }
  let v = parseInt(digitsOnly, 10);
  if(v > max) v = max;
  const str = String(v);
  if(el.value !== str) el.value = str;
  return v;
}
function _restoreIntInputIfEmpty(el){
  const min = parseInt(el.min) || 1;
  const max = parseInt(el.max) || 99;
  const v = el.value.trim() === '' ? min : Math.max(min, Math.min(max, parseInt(el.value, 10) || min));
  if(String(v) !== el.value) el.value = String(v);
}
function _clampWheelSecInput(el){
  _sanitizeIntInput(el, parseInt(el.min) || 1, parseInt(el.max) || 99);
}
// На blur — якщо після редагування одного поля min > max, підтягуємо ІНШЕ
// поле до відредагованого (а не просто відкидаємо/забороняємо ввід), щоб
// діапазон завжди лишався коректним: "4 — 3" перетворюється на "4 — 4"
// (якщо редагували min) або "3 — 3" (якщо редагували max).
function _syncWheelSecRange(changedEl){
  const minEl = document.getElementById('wheel-sec-min');
  const maxEl = document.getElementById('wheel-sec-max');
  const minV = parseInt(minEl.value, 10);
  const maxV = parseInt(maxEl.value, 10);
  if(!Number.isNaN(minV) && !Number.isNaN(maxV) && minV > maxV){
    if(changedEl === minEl) maxEl.value = String(minV);
    else minEl.value = String(maxV);
  }
}

function spinWheel(){
  if(wheelSpinning || !wheelGenres.length) return;
  const secMin = Math.max(1, Math.min(99, parseFloat(document.getElementById('wheel-sec-min').value) || 3));
  const secMax = Math.max(secMin, Math.min(99, parseFloat(document.getElementById('wheel-sec-max').value) || secMin));
  const duration = secMin + Math.random()*(secMax-secMin);

  wheelSpinning = true;
  document.getElementById('wheel-spin-btn').disabled = true;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';

  const n = wheelGenres.length;
  const segAngle = 360/n;
  const winnerIndex = Math.floor(Math.random()*n);
  // Сегмент winnerIndex опиняється під нерухомою стрілкою, коли rotation == 360 - mid (+ повні оберти).
  const fullSpins = Math.max(4, Math.round(duration*1.4)) + Math.floor(Math.random()*2);
  const mid = winnerIndex*segAngle + segAngle/2;
  const rotation = fullSpins*360 + (360 - mid);
  const disc = document.getElementById('wheel-disc');
  disc.classList.remove('revealed'); // прибрати розмиття з попереднього результату на час нового обертання
  disc.style.transitionDuration = `${duration}s`;
  disc.style.transform = `rotate(${rotation}deg)`;
  setTimeout(()=>{
    wheelSpinning = false;
    document.getElementById('wheel-spin-btn').disabled = false;
    wheelResultGenre = wheelGenres[winnerIndex];
    document.getElementById('wheel-result-genre').textContent = abbrGenre(wheelResultGenre);
    document.getElementById('wheel-result').style.display = 'flex';
    disc.classList.add('revealed'); // розмиває колесо, поки в центрі показано результат
    document.querySelectorAll('.wheel-legend-item.winner').forEach(el=>el.classList.remove('winner'));
    document.getElementById(`wheel-legend-item-${winnerIndex}`)?.classList.add('winner');
    renderWheelPlaylist();
  }, duration*1000 + 150);
}

// Плейлист показуємо одразу після зупинки колеса, ще до натискання "Слухати".
function renderWheelPlaylist(){
  if(!wheelResultGenre) return;
  currentWheelSongs = _shuffledCopy(songs.filter(s=>s.genres.includes(wheelResultGenre)));
  if(!currentWheelSongs.length) return; // жанри колеса й так беруться лише з наявних пісень
  document.getElementById('wheel-playlist-empty').style.display = 'none';
  document.getElementById('wheel-playlist-wrap').style.display = '';
  document.getElementById('wheel-playlist-title').textContent = `${abbrGenre(wheelResultGenre)} — ${currentWheelSongs.length}`;
  document.getElementById('wheel-playlist-body').innerHTML = currentWheelSongs.map(s=>`
    <tr>
      <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromWheel)" title="${t('profile.playBtn')}">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
      </button></td>
      <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
      <td data-label="${t('table.title')}">${esc(s.title)}</td>
    </tr>`).join('');
}
function playFromWheel(id){
  if(!currentWheelSongs.length) return;
  playerQueue = currentWheelSongs.slice();
  playerIndex = playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0) playerIndex = 0;
  _loadCurrent();
}
function playWheelFromStart(){
  if(!currentWheelSongs.length) return;
  playFromWheel(currentWheelSongs[0].id);
}

// Посилання на виконавців — s.artists уже розбитий по колаборантах; s.artist — фолбек для пісень без бекфілу.
function artistLinksHtml(s){
  return (s.artists && s.artists.length)
    ? s.artists.map(a => `<a href="#" class="artist-link" onclick="openArtistPage(${a.id});return false;">${esc(a.name)}</a>`).join(', ')
    : esc(s.artist);
}

// Нік автора пісні (таблиця_2) — веде на його публічний профіль.
function submitterLinkHtml(s){
  if(!s.submittedBy) return `<span style="color:var(--muted)">—</span>`;
  return `<a href="#" class="artist-link submitter-link" onclick="openUserProfileOrLogin(${s.submittedBy.userId});return false;"><svg class="icon"><use href="#icon-user"/></svg> ${esc(s.submittedBy.displayName)}</a>`;
}
function ratingChipHtml(s){
  const label = s.avgRating != null ? `${s.avgRating}<small>·${s.ratingCount}</small>` : '—';
  return `<button type="button" class="rating-chip${s.avgRating!=null?' has-rating':''}" onclick="openRatingModal(${s.id})" title="${t('rating.rateBtn')}"><svg class="icon"><use href="#icon-star"/></svg> ${label}</button>`;
}

function renderSongs(){
  const srch=document.getElementById('search').value.toLowerCase();
  const gf=document.getElementById('filter-genre').value;
  const isCommunity = homeSource === 'community';
  const filtered=activeSongs().filter(s=>{
    const mt=!srch||s.artist.toLowerCase().includes(srch)||s.title.toLowerCase().includes(srch)||(s.album&&s.album.toLowerCase().includes(srch))
      ||(isCommunity&&s.submittedBy&&s.submittedBy.displayName.toLowerCase().includes(srch));
    const mg=!gf||s.genres.includes(gf);
    return mt&&mg;
  });
  const ordered = shuffleActive
    ? [...filtered].sort((a,b)=>(shuffleOrderMap.get(a.id) ?? Infinity) - (shuffleOrderMap.get(b.id) ?? Infinity))
    : sortKey
      ? [...filtered].sort((a,b)=>{
          const va=_sortVal(a,sortKey), vb=_sortVal(b,sortKey);
          if(va<vb) return -1*sortDir;
          if(va>vb) return 1*sortDir;
          return 0;
        })
      : filtered;
  // Черга відтворення слідує за тим, що зараз реально показано в таблиці (сортування/пошук).
  displayedSongs = ordered;
  const tbody=document.getElementById('songs-body');
  if(!ordered.length){
    tbody.innerHTML=`<tr><td colspan="13"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t(isCommunity?'table.communityEmpty':'table.empty')}</div></td></tr>`;
    return;
  }
  const curId=playerQueue.length&&playerQueue[playerIndex]?playerQueue[playerIndex].id:null;
  tbody.innerHTML=ordered.map((s,i)=>{
    const isPlay=s.id===curId;
    const btnIcon=isPlay&&isPlaying()
      ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      :`<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    return `<tr class="${isPlay?'playing-row':''}">
      <td class="td-icon-lead" data-label="" style="padding:0.7rem 0.5rem 0.7rem 1rem;">
        <button class="play-row-btn${isPlay?' is-playing':''}" onclick="toggleOrPlay(${s.id}, playSong)">${btnIcon}</button>
      </td>
      <td class="num-col" data-label="${t('table.number')}">${i+1}</td>
      <td data-label="${t('table.artist')}"><strong>${artistLinksHtml(s)}</strong></td>
      <td data-label="${t('table.title')}">${esc(s.title)}</td>
      <td class="duration-col" data-label="${t('table.release')}">${fmtDate(s.release)}</td>
      <td class="duration-col" data-label="${t('table.duration')}">${s.duration}</td>
      <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
      <td data-label="${t('table.album')}">${s.album?`<span class="badge album">${esc(s.album)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
      <td class="duration-col" data-label="${t('table.plays')}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount ?? 0}</td>
      <td class="duration-col" data-label="${t('table.rating')}">${ratingChipHtml(s)}</td>
      ${isCommunity?`<td data-label="${t('table.submittedBy')}">${submitterLinkHtml(s)}</td>`:''}
      ${currentUser?.authenticated?`<td class="td-icon-trail" data-label=""><div style="display:flex;gap:6px;"><button class="btn-icon-fav${favoriteIds.has(s.id)?' active':''}" aria-label="${t('profile.favToggle')}" title="${t('profile.favToggle')}" onclick="toggleFavorite(${s.id}, this)"><svg viewBox="0 0 24 24" fill="${favoriteIds.has(s.id)?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></button><button class="btn-icon-fav" aria-label="${t('profile.addToPlaylist')}" title="${t('profile.addToPlaylist')}" onclick="openAddToPlaylistModal(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button></div></td>`:''}
      ${currentUser?.isAdmin?`<td class="td-actions" data-label="${t('table.action')}"><div style="display:flex;gap:6px;"><button class="btn-icon-edit" aria-label="${t('admin.editBtn')}" title="${t('admin.editBtn')}" onclick="openEditSongModal(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg></button><button class="btn-icon-danger" aria-label="${t('modal.confirmDelete')}" title="${t('modal.confirmDelete')}" onclick="confirmDeleteSong(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg></button></div></td>`:''}
    </tr>`;
  }).join('');
}

function isPlaying(){
  if(playerMode==='file') return !fileAudio.paused && !fileAudio.ended;
  try{return ytPlayer&&ytReady&&ytPlayer.getPlayerState()===YT.PlayerState.PLAYING;}catch(e){return false;}
}

// ================================================================
// STATS
// ================================================================
// Плавний відлік цифри від поточного значення до нового замість миттєвої підміни тексту.
function _animateCount(id, target){
  target = Number(target) || 0;
  const el = document.getElementById(id);
  const start = Number(el.textContent) || 0;
  if (start === target) { el.textContent = target; return; }
  const duration = 700, t0 = performance.now();
  function tick(now){
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function updateStats(){
  const list=activeSongs();
  const ag=new Set(list.flatMap(s=>s.genres));
  const sel=document.getElementById('filter-genre');
  const cur=sel.value;
  sel.innerHTML=`<option value="">${t('filter.allGenres')}</option>`+[...ag].sort(_textSortCmp).map(g=>`<option value="${esc(g)}"${g===cur?' selected':''}>${esc(abbrGenre(g))}</option>`).join('');
  try {
    const st = await fetch(`/api/stats?source=${homeSource}`).then(r=>r.json());
    _animateCount('stat-songs', st.totalSongs);
    _animateCount('stat-genres', st.totalGenres);
    _animateCount('stat-albums', st.totalAlbums);
    _animateCount('stat-singles', st.singles);
  } catch {
    const aa=new Set(list.filter(s=>s.album).map(s=>s.album));
    _animateCount('stat-songs', list.length);
    _animateCount('stat-genres', ag.size);
    _animateCount('stat-albums', aa.size);
    _animateCount('stat-singles', list.filter(s=>!s.album).length);
  }
}

// "Прожектор" за курсором на статкартках — координати в CSS custom properties.
document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

// ================================================================
// FORMS
// ================================================================
// Форма заявки доступна лише авторизованим — інакше пропонуємо спочатку увійти.
// kind ('catalog'|'community') — з якої таблиці прийшли; без нього лишається попередній вибір.
function openRequestPage(kind){
  if(!currentUser?.authenticated){
    if(confirm(t('msg.confirmLoginForRequest'))) login();
    return;
  }
  if(kind) setSongFormKind('req', kind);
  showPage('request');
}

// Форми заявки ('req') і адмінського додавання ('add'): таблиця_1 чи таблиця_2.
const songFormKind = { req: 'catalog', add: 'catalog' };
function setSongFormKind(prefix, kind){
  songFormKind[prefix] = kind === 'community' ? 'community' : 'catalog';
  const isCommunity = songFormKind[prefix] === 'community';
  document.getElementById(`${prefix}-kind-catalog`).classList.toggle('active', !isCommunity);
  document.getElementById(`${prefix}-kind-community`).classList.toggle('active', isCommunity);
  document.getElementById(`${prefix}-community-fields`).style.display = isCommunity ? '' : 'none';
}
// Тривалість (і назва, якщо порожня) — одразу з самого файлу, щоб не вводити вручну.
function onCommunityAudioSelected(prefix){
  const file = document.getElementById(`${prefix}-audio`).files[0];
  if(!file) return;
  const titleEl = document.getElementById(`${prefix}-title`);
  if(!titleEl.value.trim()) titleEl.value = file.name.replace(/\.[^.]+$/, '');
  const url = URL.createObjectURL(file);
  const probe = new Audio();
  probe.preload = 'metadata';
  probe.onloadedmetadata = () => {
    const d = Math.round(probe.duration);
    if(isFinite(d) && d > 0){
      const hh = String(Math.floor(d/3600)).padStart(2,'0'), mm = String(Math.floor(d%3600/60)).padStart(2,'0'), ss = String(d%60).padStart(2,'0');
      document.getElementById(`${prefix}-duration`).value = `${hh}:${mm}:${ss}`;
    }
    URL.revokeObjectURL(url);
  };
  probe.onerror = () => URL.revokeObjectURL(url);
  probe.src = url;
}
// multipart-тіло для /api/requests/community і /api/songs/community; null — не вистачає файлу/відео.
function _buildCommunityForm(prefix, fields){
  const file = document.getElementById(`${prefix}-audio`).files[0];
  const youtube = document.getElementById(`${prefix}-youtube`).value.trim();
  if(!file && !youtube){ alert(t('msg.communityNeedsFileOrVideo')); return null; }
  if(file && file.size > 25*1024*1024){ alert(t('msg.audioTooLarge')); return null; }
  const fd = new FormData();
  Object.entries(fields).forEach(([k,v])=>{ if(v!=null) fd.append(k, v); });
  if(youtube) fd.append('youtubeVideo', youtube);
  if(file) fd.append('audio', file);
  return fd;
}
function _clearCommunityFields(prefix){
  document.getElementById(`${prefix}-audio`).value = '';
  document.getElementById(`${prefix}-youtube`).value = '';
}
// Кнопка на час завантаження файлу — fetch не дає прогресу, тож хоча б явний стан.
function _setBusy(btnId, busy){
  const btn = document.getElementById(btnId);
  if(!btn) return;
  if(busy){ btn.dataset.label = btn.textContent; btn.textContent = t('msg.uploading'); btn.disabled = true; }
  else { if(btn.dataset.label) btn.textContent = btn.dataset.label; btn.disabled = false; }
}
// ================================================================
// EXTERNAL SEARCH (iTunes) — автозаповнення форми запиту/додавання
// ================================================================
let extSearchTimer = null;
function onRequestSearchInput(){
  clearTimeout(extSearchTimer);
  extSearchTimer = setTimeout(()=>runExternalSearch('req'), 450);
}
let addExtSearchTimer = null;
function onAddSearchInput(){
  clearTimeout(addExtSearchTimer);
  addExtSearchTimer = setTimeout(()=>runExternalSearch('add'), 450);
}
let editReqExtSearchTimer = null;
function onEditReqSearchInput(){
  clearTimeout(editReqExtSearchTimer);
  editReqExtSearchTimer = setTimeout(()=>runExternalSearch('edit-req'), 450);
}
function renderExtSearchItem(it, idx, prefix){
  const genreBadges = (it.genre||'').split(',').map(g=>g.trim()).filter(Boolean)
    .map(g=>`<span class="es-genre-badge">${esc(g)}</span>`).join('');
  return `
    <div class="ext-search-item" onclick="applyExternalResult('${prefix}',${idx})">
      <div class="es-main">
        <strong>${esc(it.artist)}</strong>
        <span>${esc(it.title)}</span>
        ${it.album?`<span><svg class="icon"><use href="#icon-disc"/></svg> ${esc(it.album)}</span>`:''}
      </div>
      <div class="es-meta">
        ${it.release?`<span class="es-year">${esc(it.release.slice(0,4))}</span>`:''}
        ${genreBadges}
        ${it.duration?`<span class="es-year">${esc(it.duration)}</span>`:''}
      </div>
    </div>`;
}
// Кеш результатів на префікс форми (req/add/edit-req).
const _extSearchCaches = {};
function runExternalSearch(prefix){
  const artistId = `${prefix}-artist`;
  const titleId = `${prefix}-title`;
  const albumId = `${prefix}-album`;
  // Форма "Надіслати запит" (prefix 'req') історично без префікса в id панелі.
  const panelId = prefix==='req' ? 'ext-search-panel' : `${prefix}-ext-search-panel`;
  const resultsId = prefix==='req' ? 'ext-search-results' : `${prefix}-ext-search-results`;

  const artist = document.getElementById(artistId).value.trim();
  const title = document.getElementById(titleId).value.trim();
  const album = document.getElementById(albumId).value.trim();
  const query = `${artist} ${title} ${album}`.trim();
  const panel = document.getElementById(panelId);
  const results = document.getElementById(resultsId);

  if(query.length < 2){
    panel.style.display = 'none';
    results.innerHTML = '';
    return;
  }

  const params = new URLSearchParams({ artist, title, album });
  fetch(`/api/external-search?${params.toString()}`)
    .then(r=>r.ok?r.json():[])
    .then(items=>{
      if(!items.length){ panel.style.display='none'; results.innerHTML=''; return; }
      results.innerHTML = items.map((it,idx)=>renderExtSearchItem(it, idx, prefix)).join('');
      _extSearchCaches[prefix] = items;
      panel.style.display = 'block';
    })
    .catch(()=>{ panel.style.display='none'; });
}
function applyExternalResult(prefix, idx){
  const it = (_extSearchCaches[prefix]||[])[idx];
  if(!it) return;
  document.getElementById(`${prefix}-artist`).value = it.artist || '';
  document.getElementById(`${prefix}-title`).value = it.title || '';
  if(it.release) document.getElementById(`${prefix}-release`).value = it.release;
  if(it.duration) document.getElementById(`${prefix}-duration`).value = it.duration;
  // Альбом підставляємо тільки якщо реальний — бекенд уже відфільтрував фейкові "Назва - Single".
  document.getElementById(`${prefix}-album`).value = it.album || '';
  document.getElementById(prefix==='req' ? 'ext-search-panel' : `${prefix}-ext-search-panel`).style.display = 'none';

  // iTunes дає лише один загальний жанр — жанр запитуємо в ШІ тільки для обраної пісні,
  // не для всього списку підказок (щадимо квоту безкоштовного Gemini).
  const genresField = document.getElementById(`${prefix}-genres`);
  const genresHint = document.getElementById(`${prefix}-genres-hint`);
  genresField.value = it.genre || '';
  const originalHint = genresHint.textContent;
  genresHint.textContent = t('extsearch.analyzingGenres');
  genresHint.style.color = 'var(--accent2)';
  const params = new URLSearchParams({ artist: it.artist||'', title: it.title||'', hint: it.genre||'' });
  fetch(`/api/external-search/genres?${params.toString()}`)
    .then(r=>r.ok?r.json():null)
    .then(genreStr=>{
      if(genreStr) genresField.value = genreStr;
    })
    .catch(()=>{})
    .finally(()=>{ genresHint.textContent = originalHint; genresHint.style.color = ''; });
}

function submitRequest(){
  if(!currentUser?.authenticated){alert(t('msg.needLoginForRequest'));login();return;}
  const a=document.getElementById('req-artist').value.trim();
  const t2=document.getElementById('req-title').value.trim();
  const r=document.getElementById('req-release').value;
  const d=document.getElementById('req-duration').value.trim();
  const al=document.getElementById('req-album').value.trim();
  const gr=document.getElementById('req-genres').value.trim();
  if(!a||!t2||!r||!d||!gr){alert(t('msg.fillRequiredFields'));return;}
  const isCommunity = songFormKind.req === 'community';
  let request;
  if(isCommunity){
    const fd = _buildCommunityForm('req', {artist:a,title:t2,release:r,duration:d,genres:gr,album:al||null});
    if(!fd) return;
    request = {method:'POST',body:fd};
  } else {
    const body={artist:a,title:t2,release:r,duration:d,genres:gr.split(',').map(g=>g.trim()).filter(Boolean),albumTitle:al||null};
    request = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  }
  const clearReq = () => {
    ['req-artist','req-title','req-release','req-duration','req-album','req-genres'].forEach(i=>document.getElementById(i).value='');
    _clearCommunityFields('req');
    document.getElementById('ext-search-panel').style.display = 'none';
  };
  const showReqOk = () => { const el=document.getElementById('req-alert');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500); };
  _setBusy('req-submit-btn', true);
  fetch(isCommunity ? '/api/requests/community' : '/api/requests', request)
    .then(async res=>{
      if(res.status===401){alert(t('msg.needLoginGeneric'));login();return;}
      if(!res.ok){alert(t('msg.errorSubmittingRequest') + (res.status===400 ? '\n' + await res.text() : ''));return;}
      clearReq(); showReqOk();
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>_setBusy('req-submit-btn', false));
}

// Підтаби всередині "Адмін-панелі" — перемикають ті самі блоки, що раніше були окремими вкладками навбару.
function switchAdminHubTab(tab){
  document.getElementById('admin-hub-requests-section').style.display = tab==='requests' ? '' : 'none';
  document.getElementById('admin-hub-add-section').style.display = tab==='add' ? '' : 'none';
  document.getElementById('admin-hub-tab-requests').classList.toggle('active', tab==='requests');
  document.getElementById('admin-hub-tab-add').classList.toggle('active', tab==='add');
}
function renderRequests(){
  if(!currentUser?.isAdmin){
    document.getElementById('requests-table-wrap').style.display='none';
    document.getElementById('requests-empty').style.display='block';
    return;
  }
  fetch('/api/requests')
    .then(r=>{
      if(r.status===401||r.status===403){return [];}
      return r.json();
    })
    .catch(()=>[])
    .then(data=>{
      requests=data||[];
      const tbody=document.getElementById('requests-body');
      const wrap=document.getElementById('requests-table-wrap');
      const empty=document.getElementById('requests-empty');
      if(!requests.length){wrap.style.display='none';empty.style.display='block';return;}
      wrap.style.display='block';empty.style.display='none';
      tbody.innerHTML=requests.map((r,i)=>`
        <tr><td class="num-col" data-label="${t('table.number')}">${i+1}</td>
        <td data-label="${t('table.artist')}"><strong>${esc(r.artist)}</strong></td><td data-label="${t('table.title')}">${esc(r.title)}</td>
        <td class="duration-col" data-label="${t('table.release')}">${fmtDate(r.release)}</td><td class="duration-col" data-label="${t('table.duration')}">${r.duration}</td>
        <td data-label="${t('table.genres')}">${r.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}${r.genreNamesOriginal?`<div style="color:var(--muted);font-size:0.7rem;margin-top:4px;">(${esc(r.genreNamesOriginal)})</div>`:''}</td>
        <td data-label="${t('table.album')}">${r.albumTitle?`<span class="badge album">${esc(r.albumTitle)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
        <td data-label="${t('table.source')}"><div class="req-source-cell">
          <span class="badge${r.kind==='community'?' source-community':''}">${t(r.kind==='community'?'home.source.community':'home.source.catalog')}</span>
          ${r.requester?`<div class="hint">${t('table.submittedBy')}: <a href="#" class="artist-link" onclick="openUserProfilePage(${r.requester.userId});return false;">${esc(r.requester.displayName)}</a></div>`:''}
          ${r.audioUrl?`<audio controls preload="none" src="${esc(r.audioUrl)}" class="req-audio"></audio>`:''}
          ${r.kind==='community'&&r.youtubeVideoId?`<a class="artist-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(r.youtubeVideoId)}" target="_blank" rel="noopener"><svg class="icon icon-filled"><use href="#icon-play"/></svg> YouTube</a>`:''}
        </div></td>
        <td class="td-actions" data-label="${t('table.action')}"><div class="actions-td">
          <button class="btn btn-outline" onclick="openEditRequestModal(${r.id})" title="${t('admin.editBtn')}"><svg class="icon"><use href="#icon-pencil"/></svg></button>
          <button class="btn btn-success" onclick="approveRequest(${r.id})">${t('admin.approveBtn')}</button>
          <button class="btn btn-danger" onclick="rejectRequest(${r.id})">${t('admin.rejectBtn')}</button>
        </div></td></tr>`).join('');
    });
}
function approveRequest(id){
  fetch(`/api/requests/${id}/approve`,{method:'POST'})
    .then(r=>{
      if(!r.ok){alert(t('msg.errorApprove'));return;}
      return r.json().then(data=>{
        if(data?.merged) alert(t('msg.approveMerged'));
        loadSongs().then(()=>{renderSongs();updateStats();});
        renderRequests();
      });
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deleteSong(id){
  if(playerQueue.length&&playerQueue[playerIndex]&&playerQueue[playerIndex].id===id) playerClose();
  fetch(`/api/songs/${id}`,{method:'DELETE'})
    .then(r=>{
      if(r.status===401){alert(t('msg.needLoginAdmin'));return;}
      if(!r.ok){alert(t('msg.errorDelete'));return;}
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
// Кастомне модальне вікно підтвердження видалення (замість браузерного confirm()).
function confirmDeleteSong(id){
  const song = _findSong(id);
  const label = song ? `${song.artist} — ${song.title}` : t('modal.deleteDefaultLabel');
  document.getElementById('delete-modal-text').textContent =
    t('modal.deleteBodyTemplate').replace('{label}', label);
  const confirmBtn = document.getElementById('delete-modal-confirm');
  confirmBtn.onclick = function(){
    closeDeleteModal();
    deleteSong(id);
  };
  document.getElementById('delete-modal-overlay').classList.add('open');
}
function closeDeleteModal(){
  _closeModalAnimated('delete-modal-overlay');
}
document.getElementById('delete-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeDeleteModal();
});

function rejectRequest(id){
  fetch(`/api/requests/${id}`,{method:'DELETE'})
    .then(r=>{if(!r.ok)alert(t('msg.errorReject')); else renderRequests();})
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// EDIT REQUEST (адмін редагує заявку перед підтвердженням)
// ================================================================
function openEditRequestModal(id){
  const r = requests.find(x=>x.id===id);
  if(!r) return;
  document.getElementById('edit-req-artist').value = r.artist || '';
  document.getElementById('edit-req-title').value = r.title || '';
  document.getElementById('edit-req-release').value = r.release || '';
  document.getElementById('edit-req-duration').value = r.duration || '';
  document.getElementById('edit-req-album').value = r.albumTitle || '';
  document.getElementById('edit-req-genres').value = (r.genres||[]).join(', ');
  document.getElementById('edit-req-youtube').value = r.youtubeVideoId || '';
  document.getElementById('edit-req-ext-search-panel').style.display = 'none';
  _updateEditReqYoutubeLink();
  // Текст заявки — окремий, потенційно важкий ендпоінт (як і в піснях), підвантажуємо лише зараз.
  document.getElementById('edit-req-lyrics').value = '';
  fetch(`/api/requests/${id}/lyrics`).then(r=>r.ok?r.json():null).then(d=>{
    if(d) document.getElementById('edit-req-lyrics').value = d.lyrics || '';
  }).catch(()=>{});
  document.getElementById('edit-request-save-btn').onclick = function(){ saveEditRequest(id); };
  document.getElementById('edit-request-modal-overlay').classList.add('open');
}
// Аналог _updateEditSongYoutubeLink для модалки заявки — окрема функція,
// бо працює з іншими id полів.
function _updateEditReqYoutubeLink(){
  const val = document.getElementById('edit-req-youtube').value.trim();
  const link = document.getElementById('edit-req-youtube-link');
  if(!val){ link.style.display = 'none'; return; }
  link.href = /^https?:\/\//i.test(val) ? val : `https://www.youtube.com/watch?v=${encodeURIComponent(val)}`;
  link.style.display = 'inline-block';
}
function closeEditRequestModal(){
  _closeModalAnimated('edit-request-modal-overlay');
}
document.getElementById('edit-request-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeEditRequestModal();
});
function saveEditRequest(id){
  const artist = document.getElementById('edit-req-artist').value.trim();
  const title = document.getElementById('edit-req-title').value.trim();
  const release = document.getElementById('edit-req-release').value;
  const duration = document.getElementById('edit-req-duration').value.trim();
  const album = document.getElementById('edit-req-album').value.trim();
  const genres = document.getElementById('edit-req-genres').value.trim();
  // Порожнє поле тут — навмисне очищення (як і в редагуванні пісні), не "залишити як було".
  const youtubeVideoId = document.getElementById('edit-req-youtube').value.trim();
  if(!artist||!title||!release||!duration||!genres){alert(t('msg.fillRequiredFields'));return;}
  const body = {
    artist, title, release, duration,
    genres: genres.split(',').map(g=>g.trim()).filter(Boolean),
    albumTitle: album || null,
    youtubeVideoId
  };
  const lyrics = document.getElementById('edit-req-lyrics').value;
  fetch(`/api/requests/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(r=>{
      if(!r.ok){alert(t('msg.errorEditRequest'));return;}
      // Окремий ендпоінт, як і для пісень — текст не є частиною основного DTO заявки.
      fetch(`/api/requests/${id}/lyrics`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lyrics})}).catch(()=>{});
      closeEditRequestModal();
      renderRequests();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// EDIT SONG (адмін редагує вже опубліковану пісню в головній таблиці)
// ================================================================
function editCurrentSong(){
  const s = playerQueue[playerIndex];
  if(!s) return;
  openEditSongModal(s.id);
}
function openEditSongModal(id){
  const s = _findSong(id);
  if(!s) return;
  // Заміна файлу — лише для пісень таблиці_2.
  const audioGroup = document.getElementById('edit-song-audio-group');
  const audioPreview = document.getElementById('edit-song-audio-preview');
  audioGroup.style.display = s.source === 'community' ? '' : 'none';
  document.getElementById('edit-song-audio').value = '';
  if(s.audioUrl){ audioPreview.src = s.audioUrl; audioPreview.style.display = ''; }
  else { audioPreview.removeAttribute('src'); audioPreview.style.display = 'none'; }
  document.getElementById('edit-song-artist').value = s.artist || '';
  document.getElementById('edit-song-title').value = s.title || '';
  document.getElementById('edit-song-release').value = s.release || '';
  document.getElementById('edit-song-duration').value = s.duration || '';
  document.getElementById('edit-song-album').value = s.album || '';
  document.getElementById('edit-song-genres').value = (s.genres||[]).join(', ');
  document.getElementById('edit-song-youtube').value = s.youtubeVideoId || '';
  _updateEditSongYoutubeLink();
  // Текст пісні не приходить разом з /api/songs (окремий, потенційно важкий
  // ендпоінт) — підвантажуємо лише зараз, при відкритті форми редагування.
  document.getElementById('edit-song-lyrics').value = '';
  fetch(`/api/songs/${id}/lyrics`).then(r=>r.ok?r.json():null).then(d=>{
    if(d) document.getElementById('edit-song-lyrics').value = d.lyrics || '';
  }).catch(()=>{});
  document.getElementById('edit-song-save-btn').onclick = function(){ saveEditSong(id); };
  document.getElementById('edit-song-modal-overlay').classList.add('open');
}
// Оновлює посилання "Переглянути на YouTube" наживо (приймає голий videoId або повний URL).
function _updateEditSongYoutubeLink(){
  const val = document.getElementById('edit-song-youtube').value.trim();
  const link = document.getElementById('edit-song-youtube-link');
  if(!val){ link.style.display = 'none'; return; }
  link.href = /^https?:\/\//i.test(val) ? val : `https://www.youtube.com/watch?v=${encodeURIComponent(val)}`;
  link.style.display = 'inline-block';
}
function closeEditSongModal(){
  _closeModalAnimated('edit-song-modal-overlay');
}
document.getElementById('edit-song-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeEditSongModal();
});
function saveEditSong(id){
  const artist = document.getElementById('edit-song-artist').value.trim();
  const title = document.getElementById('edit-song-title').value.trim();
  const release = document.getElementById('edit-song-release').value;
  const duration = document.getElementById('edit-song-duration').value.trim();
  const album = document.getElementById('edit-song-album').value.trim();
  const genres = document.getElementById('edit-song-genres').value.trim();
  // Порожнє поле — навмисне очищення кешу, не "залишити як було".
  const youtubeVideoId = document.getElementById('edit-song-youtube').value.trim();
  if(!artist||!title||!release||!duration||!genres){alert(t('msg.fillRequiredFields'));return;}
  const body = {
    artist, title, release, duration,
    genres: genres.split(',').map(g=>g.trim()).filter(Boolean),
    album: album || null,
    youtubeVideoId
  };
  const lyrics = document.getElementById('edit-song-lyrics').value;
  const newAudio = document.getElementById('edit-song-audio').files[0];
  fetch(`/api/songs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(async r=>{
      if(!r.ok){alert(t('msg.errorEditSong') + (r.status===400 ? '\n' + await r.text() : ''));return;}
      // Окремий ендпоінт — текст пісні не є частиною основного DTO.
      fetch(`/api/songs/${id}/lyrics`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lyrics})}).catch(()=>{});
      if(newAudio){
        const fd = new FormData(); fd.append('audio', newAudio);
        const ar = await fetch(`/api/songs/${id}/audio`,{method:'PUT',body:fd});
        if(!ar.ok) alert(t('msg.errorEditSong') + '\n' + await ar.text());
      }
      closeEditSongModal();
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

function addSong(){
  const a=document.getElementById('add-artist').value.trim();
  const t2=document.getElementById('add-title').value.trim();
  const r=document.getElementById('add-release').value;
  const d=document.getElementById('add-duration').value.trim();
  const al=document.getElementById('add-album').value.trim();
  const gr=document.getElementById('add-genres').value.trim();
  if(!a||!t2||!r||!d||!gr){alert(t('msg.fillRequiredFields'));return;}
  const isCommunity = songFormKind.add === 'community';
  let request;
  if(isCommunity){
    const fd = _buildCommunityForm('add', {artist:a,title:t2,release:r,duration:d,genres:gr,album:al||null});
    if(!fd) return;
    request = {method:'POST',body:fd};
  } else {
    const body={artist:a,title:t2,release:r,duration:d,
      genres:gr.split(',').map(g=>g.trim()).filter(Boolean),album:al||null};
    request = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  }
  const clearForm = () => {
    ['add-artist','add-title','add-release','add-duration','add-album','add-genres'].forEach(i=>document.getElementById(i).value='');
    _clearCommunityFields('add');
    document.getElementById('add-ext-search-panel').style.display = 'none';
  };
  const showOk = () => { const el=document.getElementById('add-alert');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500); };
  _setBusy('add-submit-btn', true);
  fetch(isCommunity ? '/api/songs/community' : '/api/songs', request)
    .then(async res=>{
      if(res.status===401||res.status===403){alert(t('msg.needAdminRights'));return;}
      if(!res.ok){alert(t('msg.errorAddSong') + (res.status===400 ? '\n' + await res.text() : ''));return;}
      clearForm(); showOk();
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>_setBusy('add-submit-btn', false));
}

// ================================================================
// HELPERS
// ================================================================
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Скорочення довгих назв жанрів лише для відображення (у базі й фільтрах лишається повна назва).
function abbrGenre(name){return String(name).replace(/alternative/gi,'alt');}

// ================================================================
// THEME (світла/темна)
// ================================================================
const THEME_ICONS = { dark: 'moon', gray: 'contrast', light: 'sun', system: 'monitor' };
// "Системна" — не окрема палітра, а вибір світлої/темної за налаштуванням ОС.
const _systemLightMq = window.matchMedia('(prefers-color-scheme: light)');
function _resolveTheme(theme){ return theme === 'system' ? (_systemLightMq.matches ? 'light' : 'dark') : theme; }
_systemLightMq.addEventListener?.('change', () => { if(localStorage.getItem('theme') === 'system') selectTheme('system'); });
function applyTheme(theme){
  const resolved = _resolveTheme(theme);
  // Тимчасово вимикаємо всі hover-transition, щоб зміна теми клацала миттєво.
  document.documentElement.classList.add('theme-switching');
  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem('theme', theme);
  // Колір рядка стану браузера/PWA — під фон активної теми, а не завжди чорний.
  // Hex, а не значення --bg: воно в oklch(), який meta theme-color розуміють не всі браузери.
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if(themeMeta) themeMeta.setAttribute('content', THEME_META_COLORS[resolved] || THEME_META_COLORS.dark);
  _paintArtworkColor();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove('theme-switching');
  }));
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if(icon) icon.innerHTML = `<svg class="icon"><use href="#icon-${THEME_ICONS[theme] || THEME_ICONS.dark}"/></svg>`;
  if(label){ label.setAttribute('data-i18n', 'theme.' + theme); label.textContent = t('theme.' + theme); }
  document.querySelectorAll('#theme-dropdown [data-theme-option]').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-theme-option') === theme);
  });
  syncSettingsUI();
}
const THEME_META_COLORS = { dark: '#090c14', gray: '#474c56', light: '#f8f4ec' };
// Остання точка натискання — з неї "розкривається" нова тема колом.
let _lastPointer = null;
document.addEventListener('pointerdown', e => { _lastPointer = { x: e.clientX, y: e.clientY }; }, true);
function selectTheme(theme){
  if(!document.startViewTransition || _reducedMotion() || _resolveTheme(theme) === document.documentElement.getAttribute('data-theme')){
    applyTheme(theme);
    return;
  }
  const { x, y } = _lastPointer || { x: window.innerWidth - 120, y: 28 };
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document.documentElement.classList.add('theme-vt');
  const vt = document.startViewTransition(() => applyTheme(theme));
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(()=>{});
  vt.finished.finally(() => document.documentElement.classList.remove('theme-vt'));
}

// ================================================================
// КОЛІР ОБКЛАДИНКИ → інтерфейс (як Apple Music / Spotify)
// Беремо домінантний "живий" відтінок мініатюри YouTube (i.ytimg.com
// віддає Access-Control-Allow-Origin: *, тож canvas не "брудниться") і
// підфарбовуємо ним сяйво сторінки, плеєр і рядок, що грає. Зберігаємо
// лише відтінок (hue), а яскравість/насиченість бере тема — інакше на
// світлій темі колір з темної обкладинки був би нечитабельним.
// ================================================================
let _artHue = null;   // [основний, другий, третій] відтінки палітри обкладинки
let _lastArtVid = null;
function _rgbToOklchHue(r, g, b){
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*B);
  const m = Math.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*B);
  const s = Math.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*B);
  const A = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s;
  const Bb = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s;
  return { hue: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360, chroma: Math.hypot(A, Bb) };
}
function _paintArtworkColor(){
  const root = document.documentElement;
  if(_artHue == null || !PREFS.artColors){
    ['--art', '--art2', '--art3'].forEach(p => root.style.removeProperty(p));
    return;
  }
  const theme = root.getAttribute('data-theme');
  const lc = theme === 'light' ? '0.58 0.15' : theme === 'gray' ? '0.86 0.11' : '0.76 0.14';
  root.style.setProperty('--art', `oklch(${lc} ${_artHue[0].toFixed(1)})`);
  root.style.setProperty('--art2', `oklch(${lc} ${_artHue[1].toFixed(1)})`);
  root.style.setProperty('--art3', `oklch(${lc} ${_artHue[2].toFixed(1)})`);
}
function _applyArtworkColor(vid){
  _lastArtVid = vid || null;
  if(!vid){ _artHue = null; _paintArtworkColor(); return; }
  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.onload = () => {
    try{
      const c = document.createElement('canvas'); c.width = 32; c.height = 18;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0, 32, 18);
      const px = g.getImageData(0, 0, 32, 18).data;
      // 24 кошики відтінку, вага = насиченість × "не надто темний/світлий".
      const bins = new Array(24).fill(0), hueSum = new Array(24).fill(0);
      for(let i = 0; i < px.length; i += 4){
        const { hue, chroma } = _rgbToOklchHue(px[i], px[i+1], px[i+2]);
        const lum = (px[i]*0.299 + px[i+1]*0.587 + px[i+2]*0.114) / 255;
        const w = chroma * Math.max(0, 1 - Math.abs(lum - 0.55) * 1.6);
        const b = Math.floor(hue / 15) % 24;
        bins[b] += w; hueSum[b] += hue * w;
      }
      // Палітра з трьох кольорів: найсильніший кошик + наступні, що відстоять
      // від уже вибраних щонайменше на 45° (інакше це "той самий" колір).
      // Бракує контрастних відтінків — добудовуємо аналогічні (±40°).
      const order = bins.map((w, i) => i).sort((a, b) => bins[b] - bins[a]);
      const picked = [];
      for(const b of order){
        if(bins[b] < bins[order[0]] * 0.18) break;
        const h = hueSum[b] / bins[b];
        if(picked.every(p => Math.min(Math.abs(p - h), 360 - Math.abs(p - h)) >= 45)) picked.push(h);
        if(picked.length === 3) break;
      }
      // Майже монохромна обкладинка — лишаємо фірмовий акцент.
      if(!picked.length || bins[order[0]] <= 1.2){ _artHue = null; }
      else {
        const h0 = picked[0];
        _artHue = [h0, picked[1] ?? (h0 + 40) % 360, picked[2] ?? (h0 + 320) % 360];
      }
    }catch(e){ _artHue = null; }
    _paintArtworkColor();
  };
  im.onerror = () => { _artHue = null; _paintArtworkColor(); };
  im.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(vid) + '/mqdefault.jpg';
}

// ================================================================
// НАЛАШТУВАННЯ ІНТЕРФЕЙСУ (сторінка page-settings)
// Зберігаються одним JSON у localStorage('prefs') — лише цей пристрій.
// Перше застосування (до відмальовки) робить inline-скрипт у <head>,
// тут — повторне застосування + синхронізація контролів сторінки.
// Тема й мова лишаються в окремих ключах 'theme'/'lang' (як і раніше).
// ================================================================
const PREF_DEFAULTS = {
  motion: 'system', artColors: true, glowFollow: true, glow: 100, grain: true,
  accent: 'amber', fontScale: 100, density: 'comfortable', highContrast: false, playerKeys: true,
};
const ACCENT_HUES = { amber: 78, coral: 38, rose: 5, lavender: 295, ocean: 235, emerald: 158 };
let PREFS = (() => {
  try { return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem('prefs') || '{}') }; }
  catch(e){ return { ...PREF_DEFAULTS }; }
})();
function _reducedMotion(){
  if(PREFS.motion === 'reduced') return true;
  if(PREFS.motion === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function applyPrefs(){
  const root = document.documentElement;
  const setAttr = (name, val) => val == null ? root.removeAttribute(name) : root.setAttribute(name, val);
  setAttr('data-motion', PREFS.motion === 'system' ? null : PREFS.motion);
  setAttr('data-density', PREFS.density === 'compact' ? 'compact' : null);
  setAttr('data-contrast', PREFS.highContrast ? 'high' : null);
  setAttr('data-grain', PREFS.grain ? null : 'off');
  setAttr('data-glow-follow', PREFS.glowFollow ? '' : null);
  if(PREFS.fontScale !== 100) root.style.setProperty('--font-scale', PREFS.fontScale / 100);
  else root.style.removeProperty('--font-scale');
  root.style.setProperty('--ah', ACCENT_HUES[PREFS.accent] ?? ACCENT_HUES.amber);
  root.style.setProperty('--glow-k', PREFS.glow / 100);
  _paintArtworkColor();
}
function setPref(key, value){
  if(key === 'theme'){ selectTheme(value); return; }
  if(key === 'lang'){ selectLang(value); return; }
  PREFS[key] = value;
  try { localStorage.setItem('prefs', JSON.stringify(PREFS)); } catch(e){}
  applyPrefs();
  syncSettingsUI();
}
function resetPrefs(){
  PREFS = { ...PREF_DEFAULTS };
  try { localStorage.removeItem('prefs'); } catch(e){}
  applyPrefs();
  syncSettingsUI();
}
function syncSettingsUI(){
  const page = document.getElementById('page-settings');
  if(!page) return;
  const values = { ...PREFS, theme: localStorage.getItem('theme') || 'dark', lang: currentLang };
  page.querySelectorAll('[data-pref]').forEach(el => {
    const key = el.getAttribute('data-pref');
    const val = values[key];
    if(el.type === 'checkbox') el.checked = !!val;
    else if(el.type === 'range'){
      el.value = val;
      el.style.setProperty('--fill', ((val - el.min) / (el.max - el.min) * 100) + '%');
      const out = document.getElementById('pref-' + key + '-out');
      if(out) out.textContent = val + '%';
    } else {
      el.querySelectorAll('[data-value]').forEach(b => {
        const on = String(val) === b.getAttribute('data-value');
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
  });
}
function loadSettingsPage(){
  const link = document.getElementById('settings-profile-link');
  if(link) link.style.display = currentUser?.authenticated ? '' : 'none';
  syncSettingsUI();
}
// Делегування: один обробник на всю сторінку замість onclick на кожному контролі.
(() => {
  const page = document.getElementById('page-settings');
  if(!page) return;
  page.addEventListener('click', e => {
    const btn = e.target.closest('[data-pref] [data-value]');
    if(!btn) return;
    const key = btn.closest('[data-pref]').getAttribute('data-pref');
    const raw = btn.getAttribute('data-value');
    setPref(key, /^\d+$/.test(raw) ? parseInt(raw, 10) : raw);
  });
  page.addEventListener('change', e => {
    const el = e.target;
    if(el.type === 'checkbox' && el.dataset.pref) setPref(el.dataset.pref, el.checked);
  });
  page.addEventListener('input', e => {
    const el = e.target;
    if(el.type === 'range' && el.dataset.pref) setPref(el.dataset.pref, parseInt(el.value, 10));
  });
})();
applyPrefs();

// Клавіші плеєра: пробіл — пауза, Shift+←/→ — попередня/наступна, M — звук.
let _volBeforeMute = null;
document.addEventListener('keydown', e => {
  if(!PREFS.playerKeys || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if(!document.getElementById('player-bar')?.classList.contains('visible')) return;
  // Відкрите модальне вікно (батл тощо) має власні клавіші — не заважаємо.
  if(document.querySelector('.modal-overlay.open')) return;
  if(e.code === 'Space' && tag !== 'button' && tag !== 'a'){ e.preventDefault(); playerToggle(); }
  else if(e.shiftKey && e.key === 'ArrowRight'){ e.preventDefault(); playerNext(); }
  else if(e.shiftKey && e.key === 'ArrowLeft'){ e.preventDefault(); playerPrev(); }
  else if(!e.shiftKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')){
    e.preventDefault();
    if(vol > 0){ _volBeforeMute = vol; setVolume(0); }
    else setVolume(_volBeforeMute || 80);
    const slider = document.getElementById('vol-slider');
    if(slider) slider.value = vol;
  }
});

// "/" або Ctrl/⌘+K — фокус на глобальний пошук (як у GitHub/Linear).
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  const isK = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK');
  if(isK || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)){
    const input = document.getElementById('nav-search-input');
    if(!input) return;
    e.preventDefault();
    input.focus();
    input.select();
  }
});
function fmtDate(d){const[y,m,day]=d.split('-');return`${day}.${m}.${y}`;}
function fmtSec(s){s=Math.floor(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

// ================================================================
// CONFIG & AUTH
// ================================================================
let currentUser = null;
// Кілька ключів для автоматичної ротації, коли поточний впирається у денний ліміт квоти.
let ytApiKeys = ['AIzaSyD5hFlUEq2bOv7r5XstBHKLUEND8E5ZThA', 'AIzaSyCKI5XDq_JwVrVK5tWjNC0Z9byuPijSLa4'];
let ytApiKeyIdx = 0;

// Мінімальний час показу сплешу — на швидкому з'єднанні дані готові за
// лічені мс, і сплеш без цього блимнув би непомітною смугою замість того,
// щоб просто плавно зникнути (миготіння відчувається гірше, ніж коротка затримка).
const _splashStart = performance.now();
function _hideSplash(){
  const el = document.getElementById('app-splash');
  if(!el) return;
  const elapsed = performance.now() - _splashStart;
  setTimeout(() => {
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 450);
  }, Math.max(0, 350 - elapsed));
}

async function initApp() {
  const [cfgRes, meRes] = await Promise.all([
    fetch('/config').then(r=>r.ok?r.json():{}).catch(()=>({})),
    fetch('/auth/me').then(r=>r.ok?r.json():{authenticated:false}).catch(()=>({authenticated:false}))
  ]);
  if(cfgRes.youtubeApiKeys && cfgRes.youtubeApiKeys.length) ytApiKeys = cfgRes.youtubeApiKeys;
  currentUser = meRes;
  if(currentUser?.authenticated){
    try {
      const profile = await fetch('/api/profile').then(r=>r.ok?r.json():null);
      if(profile){ currentUser.displayName = profile.displayName; currentUser.avatarUrl = profile.avatarUrl; }
    } catch(e) {}
  }
  try {
    await loadSongs();
  } catch(e) {
    console.error('loadSongs error:', e);
  }
  renderAuthArea();
  renderSongs();
  await updateStats();
  _hideSplash();
}

function renderAuthArea() {
  const area = document.getElementById('auth-area');
  const isAdmin = currentUser?.isAdmin;
  const authed = currentUser?.authenticated;
  document.body.classList.toggle('admin-mode', !!isAdmin);
  document.body.classList.toggle('authed-mode', !!authed);

  document.getElementById('tab-request').style.display = authed ? '' : 'none';
  document.getElementById('tab-recommendations').style.display = authed ? '' : 'none';
  const thAction = document.getElementById('th-action');
  if(thAction) thAction.style.display = isAdmin ? '' : 'none';
  const thFav = document.getElementById('th-fav');
  if(thFav) thFav.style.display = authed ? '' : 'none';
  const normalizeBtn = document.getElementById('normalize-genres-btn');
  if(normalizeBtn) normalizeBtn.style.display = isAdmin ? '' : 'none';
  const btnEditCurrent = document.getElementById('btn-edit-current');
  if(btnEditCurrent) btnEditCurrent.style.display = (isAdmin && playerQueue[playerIndex]) ? '' : 'none';
  const btnRateCurrent = document.getElementById('btn-rate-current');
  if(btnRateCurrent) btnRateCurrent.style.display = playerQueue[playerIndex] ? '' : 'none';

  if(authed) loadFavoriteIds(); else favoriteIds = new Set();

  if (authed) {
    const avatarSrc = currentUser.avatarUrl || currentUser.picture;
    const pic = avatarSrc
      ? `<img src="${avatarSrc}" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);object-fit:cover;">`
      : `<span style="width:28px;height:28px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:0.9rem;color:var(--muted);"><svg class="icon"><use href="#icon-user"/></svg></span>`;
    const displayLabel = currentUser.displayName || currentUser.name || currentUser.email || '';
    area.innerHTML = `
      <div class="dropdown" id="notif-dropdown" style="margin-right:0.3rem;">
        <button class="dropdown-toggle" onclick="toggleDropdown(event,'notif-dropdown'); onOpenNotifDropdown();" title="${t('notif.bellTitle')}">
          <svg class="icon"><use href="#icon-bell"/></svg><span id="notif-badge" class="badge" style="display:none;margin-left:2px;"></span>
        </button>
        <div class="dropdown-menu" id="notif-list" style="min-width:320px;max-height:420px;overflow-y:auto;"></div>
      </div>
      <button class="dropdown-toggle" onclick="openChatPage('dm')" title="${t('chat.tab.dm')}" style="margin-right:0.3rem;">
        <svg class="icon"><use href="#icon-chat"/></svg><span id="dm-badge" class="badge" style="display:none;margin-left:2px;"></span>
      </button>
      <div class="dropdown" id="profile-dropdown">
        <button class="dropdown-toggle" onclick="toggleDropdown(event,'profile-dropdown')" title="${t('nav.profile')}" style="height:auto;padding:0.25rem 0.6rem 0.25rem 0.3rem;">
          ${pic}
          <span style="color:var(--muted);font-size:0.78rem;font-family:var(--font-ui);">${esc(displayLabel)}</span>
        </button>
        <div class="dropdown-menu">
          <button onclick="showPage('profile')" data-i18n="nav.profile">${t('nav.profile')}</button>
          <button onclick="showPage('profile-settings')" data-i18n="nav.profileSettings">${t('nav.profileSettings')}</button>
          <button onclick="showPage('friends')" data-i18n="nav.friends">${t('nav.friends')}</button>
          <button onclick="openChatPage('dm')" data-i18n="nav.messages">${t('nav.messages')}</button>
          ${isAdmin?`<button onclick="showPage('admin-hub')" id="tab-admin-hub" class="nav-menu-item"><svg class="icon"><use href="#icon-settings"/></svg> ${t('nav.adminHub')}<span id="admin-requests-badge" class="badge" style="display:none;margin-left:auto;"></span></button>`:''}
        </div>
      </div>
      ${isAdmin?'<span style="background:var(--accent);color:var(--on-accent);font-size:0.65rem;font-family:var(--font-ui);padding:0.15rem 0.5rem;border-radius:4px;font-weight:700;">ADMIN</span>':''}
      <button onclick="logout()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:0.3rem 0.75rem;font-size:0.72rem;font-family:var(--font-ui);cursor:pointer;">${t('auth.logout')}</button>
    `;
    refreshNotifBadge();
    refreshDmBadge();
    if(isAdmin) refreshAdminRequestsBadge();
  } else {
    area.innerHTML = `
      <button onclick="login()" class="nav-login-btn">
        ${t('auth.loginBtn')}
      </button>
    `;
  }
}

// ================================================================
// СПОВІЩЕННЯ (дзвіночок) — підписки на виконавців
// ================================================================
// Бейдж/список — події виконавців + вхідні запити дружби; запити зникають зі списку при прийнятті/відхиленні.
function refreshNotifBadge(){
  const badge = document.getElementById('notif-badge');
  if(!badge) return;
  Promise.all([
    fetch('/api/notifications?limit=1').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).catch(()=>[]),
    currentUser?.isAdmin ? fetch('/api/admin-notifications?limit=1').then(r=>r.ok?r.json():null).catch(()=>null) : Promise.resolve(null)
  ]).then(([notif, incoming, adminNotif])=>{
    const count = (notif?.unreadCount || 0) + (incoming?.length || 0) + (adminNotif?.unreadCount || 0);
    if(count > 0){ badge.textContent = count > 99 ? '99+' : count; badge.style.display = ''; }
    else { badge.style.display = 'none'; }
  });
}
function _notifEventText(type){
  if(type === 'song_added') return t('notif.event.songAdded');
  if(type === 'song_removed') return t('notif.event.songRemoved');
  if(type === 'lyrics_added') return t('notif.event.lyricsAdded');
  return type;
}
// "hito схвалює запит", "hito додав" — дієслово залежить від типу події адмін-журналу.
function _adminEventText(n){
  const actor = n.actor ? `<strong>${esc(n.actor.displayName)}</strong>` : `<strong>${esc(t('adminNotif.someone'))}</strong>`;
  const verb = t('adminNotif.' + n.eventType);
  const src = n.source === 'community' ? ` <span class="badge source-community">${t('home.source.community')}</span>` : '';
  return `${actor} ${esc(verb)}${src}`;
}
function onOpenNotifDropdown(){
  const list = document.getElementById('notif-list');
  list.innerHTML = `<div style="padding:0.8rem;color:var(--muted);font-size:0.8rem;">${t('notif.loading')}</div>`;
  Promise.all([
    fetch('/api/notifications?limit=30').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).catch(()=>[]),
    currentUser?.isAdmin ? fetch('/api/admin-notifications?limit=30').then(r=>r.ok?r.json():null).catch(()=>null) : Promise.resolve(null)
  ]).then(([d, incoming, adminData])=>{
    const recent = d?.recent || [];
    const adminRecent = adminData?.recent || [];
    const adminUnread = adminData?.unreadCount || 0;
    if(!recent.length && !incoming.length && !adminRecent.length){
      list.innerHTML = `<div style="padding:0.8rem;color:var(--muted);font-size:0.8rem;">${t('notif.empty')}</div>`;
      return;
    }
    const incomingHtml = incoming.map(r=>`
      <div style="padding:0.5rem 0.8rem;border-top:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;" onclick="openUserProfilePage(${r.userId})">
        <div style="font-size:0.8rem;"><strong>${esc(r.displayName)}</strong><div style="font-size:0.72rem;color:var(--muted);">${t('friends.incomingRequestLabel')}</div></div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-primary" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="event.stopPropagation();acceptFriendRequest(${r.requestId})">${t('friends.acceptBtn')}</button>
          <button class="btn btn-outline" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.rejectBtn')}</button>
        </div>
      </div>`).join('');
    const notifHtml = recent.map(n=>`
      <div style="padding:0.5rem 0.8rem;border-top:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;" onclick="openArtistPage(${n.artistId})">
        <div>
          <div style="font-size:0.8rem;"><strong>${esc(n.artistName)}</strong> — ${_notifEventText(n.eventType)}</div>
          <div style="font-size:0.75rem;color:var(--muted);">${esc(n.songLabel)}</div>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:2px;">${esc(n.createdAt)}</div>
        </div>
        <button class="btn btn-outline" style="font-size:0.7rem;padding:0.15rem 0.4rem;flex-shrink:0;" title="${t('notif.markOneRead')}" onclick="event.stopPropagation();markOneNotificationRead(${n.id})"><svg class="icon"><use href="#icon-check"/></svg></button>
      </div>`).join('');
    // Непрочитані адмін-події йдуть першими в списку (сортування — новіші вгорі).
    const adminHtml = adminRecent.length ? `
      <div class="notif-section-title">${t('adminNotif.sectionTitle')}</div>
      ${adminRecent.map((n,i)=>`
      <div class="notif-item${i<adminUnread?' unread':''}" onclick="showPage('admin-hub')">
        <div style="font-size:0.8rem;">${_adminEventText(n)}</div>
        <div style="font-size:0.75rem;color:var(--muted);">${esc(n.label)}</div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:2px;">${esc(n.createdAt)}</div>
      </div>`).join('')}
      ${(recent.length || incoming.length) ? `<div class="notif-section-title">${t('notif.sectionTitle')}</div>` : ''}` : '';
    list.innerHTML = `
      ${(recent.length || adminUnread) ? `<div style="display:flex;justify-content:flex-end;padding:0.3rem 0.5rem;">
        <button class="btn btn-outline" style="font-size:0.7rem;padding:0.25rem 0.6rem;" onclick="markAllNotificationsRead()">${t('notif.markAllRead')}</button>
      </div>` : ''}
      ${adminHtml}${incomingHtml}${notifHtml}
    `;
  });
}
function markAllNotificationsRead(){
  Promise.all([
    fetch('/api/notifications/mark-read', { method:'POST' }),
    currentUser?.isAdmin ? fetch('/api/admin-notifications/mark-read', { method:'POST' }) : Promise.resolve()
  ]).then(()=>{ refreshNotifBadge(); onOpenNotifDropdown(); }).catch(()=>{});
}
// Кількість заявок, що чекають розгляду — біля пункту "Адмін-панель" у меню профілю.
function refreshAdminRequestsBadge(){
  const badge = document.getElementById('admin-requests-badge');
  if(!badge || !currentUser?.isAdmin) return;
  fetch('/api/requests').then(r=>r.ok?r.json():[]).then(list=>{
    badge.textContent = list.length > 99 ? '99+' : list.length;
    badge.style.display = list.length ? '' : 'none';
  }).catch(()=>{});
}
function markOneNotificationRead(eventId){
  fetch(`/api/notifications/${eventId}/mark-read`, { method:'POST' }).then(()=>{ refreshNotifBadge(); onOpenNotifDropdown(); }).catch(()=>{});
}

function login() { window.location.href = '/auth/login'; }

// Обидві головні таблиці разом — будь-яка мутація (підтвердження заявки,
// редагування) може зачепити будь-яку з них.
async function loadSongs() {
  const [res, communityRes] = await Promise.all([fetch('/api/songs'), fetch('/api/songs?source=community')]);
  if (!res.ok) throw new Error('songs fetch failed');
  songs = await res.json();
  if (communityRes.ok) communitySongs = await communityRes.json();
}

async function logout() {
  await fetch('/auth/logout', {method:'POST'});
  currentUser = {authenticated:false};
  // Перепідключення — щоб сервер вивів з'єднання з групи користувача/адмінів.
  if(rtConn) rtConn.stop().then(()=>rtConn.start()).catch(()=>{});
  renderAuthArea();
  // Go to home, re-render
  showPage('home');
}

// ================================================================
// PLAYER
// ================================================================
let ytPlayer=null,ytReady=false;
let playerQueue=[],playerIndex=0;
// Прапорець "пісню вже зараховано як прослухану" — скидається при переключенні на нову пісню.
let listenLogged=false;
// userIntendedPlaying: чи музика МАЄ грати за наміром користувача — відрізняє реальний
// play/pause від технічних onStateChange під час синхронізації відео-попапу.
let userIntendedPlaying=true;
let ticker=null,pendingVid=null;
let shuffle=false,repeat=false,seekDrag=false;
// Гучність зберігається в localStorage — інакше плеєр щоразу стартував на 80%.
const _savedVol = localStorage.getItem('volume');
let vol = _savedVol !== null ? parseInt(_savedVol) : 80;
// 'yt' — прихований YouTube-плеєр; 'file' — <audio> для завантажених файлів
// пісень ком'юніті. Усе керування (пауза, перемотка, гучність, тікер) іде
// через хелпери _p*(), які звертаються до активного з двох.
let playerMode = 'yt';
const fileAudio = document.getElementById('file-audio');
function _pReady(){ return playerMode==='file' ? !!fileAudio.src : (ytPlayer&&ytReady); }
function _pTime(){ return playerMode==='file' ? (fileAudio.currentTime||0) : ytPlayer.getCurrentTime(); }
function _pDuration(){ return playerMode==='file' ? (isFinite(fileAudio.duration)?fileAudio.duration:0) : ytPlayer.getDuration(); }
function _pSeek(sec){ if(playerMode==='file') fileAudio.currentTime = sec; else ytPlayer.seekTo(sec,true); }
function _pPlay(){ try{ if(playerMode==='file') fileAudio.play().catch(()=>{}); else if(ytPlayer&&ytReady) ytPlayer.playVideo(); }catch(e){} }
function _pPause(){ try{ if(playerMode==='file') fileAudio.pause(); else if(ytPlayer&&ytReady) ytPlayer.pauseVideo(); }catch(e){} }
function _stopFileAudio(){ fileAudio.pause(); fileAudio.removeAttribute('src'); fileAudio.load(); }

fileAudio.addEventListener('playing', ()=>{
  if(playerMode!=='file') return;
  userIntendedPlaying=true;
  setPP(true);startTick();setLoad(false);setEQ(true);
  document.getElementById('p-dur').textContent=fmtSec(_pDuration());
  renderSongs();
});
fileAudio.addEventListener('pause', ()=>{
  if(playerMode!=='file' || fileAudio.ended) return;
  userIntendedPlaying=false;
  setPP(false);stopTick();setEQ(false);renderSongs();
});
fileAudio.addEventListener('ended', ()=>{
  if(playerMode!=='file') return;
  setPP(false);stopTick();setEQ(false);
  if(repeat){ fileAudio.currentTime=0; fileAudio.play().catch(()=>{}); }
  else playerNext();
});
fileAudio.addEventListener('waiting', ()=>{ if(playerMode==='file') setLoad(true); });
fileAudio.addEventListener('error', ()=>{
  if(playerMode!=='file' || !fileAudio.getAttribute('src')) return;
  setLoad(false);
  const s=playerQueue[playerIndex];
  if(s) document.getElementById('p-title').textContent=s.title+t('audio.notFoundSuffix');
});

function onYouTubeIframeAPIReady(){
  ytPlayer=new YT.Player('yt-iframe',{
    height:'1',width:'1',
    playerVars:{autoplay:0,controls:0},
    events:{
      onReady:()=>{
        ytReady=true;
        ytPlayer.setVolume(vol);
        if(pendingVid){_load(pendingVid);pendingVid=null;}
      },
      onStateChange:onState
    }
  });
}

function onState(e){
  // stopVideo() при переході на файловий плеєр теж дає події — вони вже не про поточну пісню.
  if(playerMode!=='yt') return;
  const S=YT.PlayerState;
  if(e.data===S.PLAYING){
    userIntendedPlaying=true;
    setPP(true);startTick();setLoad(false);setEQ(true);
    document.getElementById('p-dur').textContent=fmtSec(ytPlayer.getDuration());
    renderSongs();
    // Попап може бути відкритий, а відео там на паузі (плеєр відновили не через попап) — доганяємо.
    if(videoPopupOpen && popupPlayer && popupReady){
      try{ if(popupPlayer.getPlayerState()!==S.PLAYING) popupPlayer.playVideo(); }catch(ex){}
    }
  }else if(e.data===S.PAUSED){
    userIntendedPlaying=false;
    setPP(false);stopTick();setEQ(false);renderSongs();
    // Пауза на панелі має ставити на паузу й відео в попапі, інакше воно "оживить" звук назад.
    if(videoPopupOpen && popupPlayer && popupReady){
      try{ if(popupPlayer.getPlayerState()===S.PLAYING) popupPlayer.pauseVideo(); }catch(ex){}
    }
  }else if(e.data===S.ENDED){
    setPP(false);stopTick();setEQ(false);
    if(repeat){ytPlayer.seekTo(0);ytPlayer.playVideo();}
    else playerNext();
  }else if(e.data===S.BUFFERING){
    setLoad(true);
  }
}

function playSong(id){
  playerQueue=(displayedSongs.length?displayedSongs:songs).slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}

// Якщо клікнута пісня вже завантажена — перемикаємо пауза/відтворення замість перезапуску черги.
function toggleOrPlay(id, playFn){
  const curId = playerQueue.length && playerQueue[playerIndex] ? playerQueue[playerIndex].id : null;
  if(curId === id) playerToggle();
  else playFn(id);
}

// playerQueue обмежуємо піснями плейлиста — next/prev/shuffle працюють лише в його межах.
let currentPlaylistSongs = [];
function playFromPlaylist(id){
  if(!currentPlaylistSongs.length) return;
  playerQueue=currentPlaylistSongs.slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}
function playPlaylistFromStart(){
  if(!currentPlaylistSongs.length) return;
  playFromPlaylist(currentPlaylistSongs[0].id);
}

// ================================================================
// БАТЛ РОЯЛЬ: одиночне вибування з плейлиста (16/32/64 учасників)
// ================================================================
const BATTLE_SIZES = [16, 32, 64];
let battleRound = [];    // пісні поточного раунду (парна кількість, i та i+1 — пара)
let battleWinners = [];  // переможці поточного раунду, стають battleRound наступного
let battleMatchIndex = 0;
let battleLeftPlayer = null, battleRightPlayer = null;
let battlePlayersReady = false;
let battleHoverModeActive = false;
let battleInitialSize = 0;   // розмір турніру на старті — для стрічки прогресу
let battleTransitioning = false; // йде анімація вибору — ігноруємо повторні кліки/клавіші
let battleChampionSong = null;

// Сторінка "Батл рояль" у навбарі: власні плейлисти (якщо залогінені) + публічні чужі.
function openBattlePage(){
  const ownSection = document.getElementById('battle-page-own-login-hint');
  const ownEmpty = document.getElementById('battle-page-own-empty');
  const ownList = document.getElementById('battle-page-own-list');
  if(currentUser?.authenticated){
    ownSection.style.display = 'none';
    fetch('/api/playlists').then(r=>r.ok?r.json():[]).then(list=>{
      ownEmpty.style.display = list.length ? 'none' : '';
      ownList.innerHTML = list.map(p=>`
        <div class="battle-pl-card" onclick="startBattleFromPlaylist(${p.id})">
          <div class="battle-pl-icon"><svg class="icon"><use href="#icon-headphones"/></svg></div>
          <div class="battle-pl-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
          ${p.isPublic?`<span class="badge">${t('battle.publicBadge')}</span>`:''}
          <svg class="icon battle-pl-arrow"><use href="#icon-arrow-right"/></svg>
        </div>`).join('');
    }).catch(()=>{});
  } else {
    ownSection.style.display = '';
    ownEmpty.style.display = 'none';
    ownList.innerHTML = '';
  }
  fetch('/api/playlists/public').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('battle-page-public-empty').style.display = list.length ? 'none' : '';
    document.getElementById('battle-page-public-list').innerHTML = list.map(p=>`
      <div class="battle-pl-card battle-pl-card-community" onclick="startBattleFromPlaylist(${p.id})">
        <div class="battle-pl-icon"><svg class="icon"><use href="#icon-globe"/></svg></div>
        <div class="battle-pl-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')} — ${esc(p.ownerLabel)}</span></div>
        <svg class="icon battle-pl-arrow"><use href="#icon-arrow-right"/></svg>
      </div>`).join('');
  }).catch(()=>{});
}
// currentPlaylistSongs — той самий "поточний плейлист", яким користується і сторінка плейлиста.
function startBattleFromPlaylist(id){
  fetch(`/api/playlists/${id}`).then(r=>r.ok?r.json():null).then(p=>{
    if(!p) return;
    currentPlaylistId = id;
    currentPlaylistSongs = p.songs;
    openBattleSetup();
  }).catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ВИКОНАВЦІ: каталог, пошук, сторінка виконавця з дискографією й підпискою
// ================================================================
let artistsSearchTimer = null;
function onArtistsSearchInput(){
  clearTimeout(artistsSearchTimer);
  artistsSearchTimer = setTimeout(loadArtistsPage, 350);
}
function loadArtistsPage(){
  const q = document.getElementById('artists-search').value.trim();
  fetch(`/api/artists${q ? '?q=' + encodeURIComponent(q) : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('artists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('artists-list').innerHTML = list.map(a=>`
      <div class="ext-search-item" onclick="openArtistPage(${a.id})">
        <div class="es-main"><strong>${esc(a.name)}</strong><span>${a.songCount} ${t('artists.songsWord')}</span></div>
      </div>`).join('');
  }).catch(()=>{});
}
let currentArtistId = null;
let currentArtistSongs = [];
function openArtistPage(id){
  currentArtistId = id;
  showPage('artist');
}
function loadArtistPage(){
  const id = currentArtistId;
  if(id == null) return;
  document.getElementById('artist-content').style.display = 'none';
  document.getElementById('artist-not-found').style.display = 'none';
  fetch(`/api/artists/${id}`).then(r=>r.ok?r.json():null).then(a=>{
    if(!a){ document.getElementById('artist-not-found').style.display = ''; return; }
    document.getElementById('artist-content').style.display = '';
    document.getElementById('artist-name').textContent = a.name;
    document.getElementById('artist-follower-count').textContent = `${a.followerCount} ${t('artist.followers')}`;
    const btn = document.getElementById('artist-follow-btn');
    btn.innerHTML = a.isFollowing ? `<svg class="icon"><use href="#icon-check"/></svg> ${esc(t('artist.unfollowBtn'))}` : esc(t('artist.followBtn'));
    btn.classList.toggle('active', !!a.isFollowing);
    btn.style.display = currentUser?.authenticated ? '' : 'none';

    fetch(`/api/artists/${id}/songs`).then(r=>r.ok?r.json():[]).then(songs=>{
      currentArtistSongs = songs;
      document.getElementById('artist-songs-body').innerHTML = songs.map(s=>`
        <tr>
          <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromArtist)" title="${t('profile.playBtn')}">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          </button></td>
          <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
          <td data-label="${t('table.title')}">${esc(s.title)}</td>
          <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        </tr>`).join('');
    }).catch(()=>{});
  }).catch(()=>{ document.getElementById('artist-not-found').style.display = ''; });
}
function playFromArtist(id){
  if(!currentArtistSongs.length) return;
  playerQueue = currentArtistSongs.slice();
  playerIndex = playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0) playerIndex = 0;
  _loadCurrent();
}
function toggleArtistFollow(){
  if(!currentUser?.authenticated){ login(); return; }
  const id = currentArtistId;
  if(id == null) return;
  const btn = document.getElementById('artist-follow-btn');
  const wasFollowing = btn.classList.contains('active');
  const method = wasFollowing ? 'DELETE' : 'POST';
  fetch(`/api/artists/${id}/follow`, { method })
    .then(r=>{ if(r.ok) loadArtistPage(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ДРУЗІ: пошук людей, вхідні/надіслані запити, список друзів
// ================================================================
let friendsSearchTimer = null;
function onFriendsSearchInput(){
  clearTimeout(friendsSearchTimer);
  friendsSearchTimer = setTimeout(runFriendsSearch, 350);
}
function _friendActionButtonHtml(u){
  if(u.relationshipStatus === 'friends')
    return `<button class="btn btn-outline active" onclick="event.stopPropagation();unfriendUser(${u.userId})"><svg class="icon"><use href="#icon-check"/></svg> ${esc(t('friends.friendsBadge'))}</button>`;
  if(u.relationshipStatus === 'pending_outgoing')
    return `<button class="btn btn-outline" onclick="event.stopPropagation();alert('${esc(t('friends.pendingLabel'))}')" title="${t('friends.pendingLabel')}">${t('friends.pendingLabel')}</button>`;
  if(u.relationshipStatus === 'pending_incoming')
    return `<button class="btn btn-primary" onclick="event.stopPropagation();acceptFriendRequestFromUser(${u.userId})">${t('friends.acceptBtn')}</button>`;
  return `<button class="btn btn-primary" onclick="event.stopPropagation();sendFriendRequest(${u.userId})">${t('friends.addBtn')}</button>`;
}
function runFriendsSearch(){
  const q = document.getElementById('friends-search').value.trim();
  const wrap = document.getElementById('friends-search-results');
  const empty = document.getElementById('friends-search-empty');
  if(!q){ wrap.innerHTML = ''; empty.style.display = 'none'; return; }
  fetch(`/api/users/search?q=${encodeURIComponent(q)}`).then(r=>r.ok?r.json():[]).then(list=>{
    empty.style.display = list.length ? 'none' : '';
    wrap.innerHTML = list.map(u=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${u.userId})">
        <div class="es-main"><strong>${esc(u.displayName)}</strong></div>
        ${_friendActionButtonHtml(u)}
      </div>`).join('');
  }).catch(()=>{});
}
function loadFriendsPage(){
  if(!currentUser?.authenticated){ showPage('home'); login(); return; }
  document.getElementById('friends-search').value = '';
  document.getElementById('friends-search-results').innerHTML = '';

  fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-incoming-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-incoming-list').innerHTML = list.map(r=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${r.userId})">
        <div class="es-main"><strong>${esc(r.displayName)}</strong></div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-primary" onclick="event.stopPropagation();acceptFriendRequest(${r.requestId})">${t('friends.acceptBtn')}</button>
          <button class="btn btn-outline" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.rejectBtn')}</button>
        </div>
      </div>`).join('');
  }).catch(()=>{});

  fetch('/api/friends/requests/outgoing').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-outgoing-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-outgoing-list').innerHTML = list.map(r=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${r.userId})">
        <div class="es-main"><strong>${esc(r.displayName)}</strong></div>
        <button class="btn btn-outline" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.cancelBtn')}</button>
      </div>`).join('');
  }).catch(()=>{});

  fetch('/api/friends').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-list-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-list').innerHTML = list.map(u=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${u.userId})">
        <div class="es-main"><strong>${esc(u.displayName)}</strong></div>
        <button class="btn btn-outline" onclick="event.stopPropagation();unfriendUser(${u.userId})">${t('friends.unfriendBtn')}</button>
      </div>`).join('');
  }).catch(()=>{});
}
function sendFriendRequest(targetUserId){
  fetch('/api/friends/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ targetUserId }) })
    .then(r=>{ if(r.ok){ runFriendsSearch(); if(document.getElementById('page-friends').classList.contains('active')) loadFriendsPage(); if(currentProfileUserId===targetUserId) loadUserProfilePage(); } else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function acceptFriendRequest(requestId){
  fetch(`/api/friends/requests/${requestId}/accept`, { method:'POST' })
    .then(r=>{ if(r.ok){ loadFriendsPage(); refreshNotifBadge(); onOpenNotifDropdown(); } else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function acceptFriendRequestFromUser(userId){
  // Пошук людей не знає requestId (лише статус) — знаходимо його через вхідні запити.
  fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).then(list=>{
    const req = list.find(r=>r.userId===userId);
    if(req) acceptFriendRequest(req.requestId);
  }).catch(()=>{});
}
function cancelOrRejectFriendRequest(requestId){
  fetch(`/api/friends/requests/${requestId}`, { method:'DELETE' })
    .then(()=>{ loadFriendsPage(); refreshNotifBadge(); onOpenNotifDropdown(); if(currentProfileUserId!=null) loadUserProfilePage(); })
    .catch(()=>{});
}
function unfriendUser(userId){
  fetch(`/api/friends/${userId}`, { method:'DELETE' })
    .then(()=>{ loadFriendsPage(); if(currentProfileUserId===userId) loadUserProfilePage(); })
    .catch(()=>{});
}

// ================================================================
// ПУБЛІЧНИЙ ПРОФІЛЬ іншого користувача
// ================================================================
let currentProfileUserId = null;
function openUserProfilePage(userId){
  currentProfileUserId = userId;
  showPage('user-profile');
}
function loadUserProfilePage(){
  const id = currentProfileUserId;
  if(id == null) return;
  document.getElementById('user-profile-content').style.display = 'none';
  document.getElementById('user-profile-not-found').style.display = 'none';
  fetch(`/api/users/${id}`).then(r=>r.ok?r.json():null).then(u=>{
    if(!u){ document.getElementById('user-profile-not-found').style.display = ''; return; }
    document.getElementById('user-profile-content').style.display = '';
    document.getElementById('user-profile-name').textContent = u.displayName;
    document.getElementById('user-profile-member-since').textContent = u.memberSince ? `${t('profile.public.memberSince')} ${u.memberSince}` : '';
    const img = document.getElementById('user-profile-avatar');
    const ph = document.getElementById('user-profile-avatar-ph');
    if(u.avatarUrl){ img.src = u.avatarUrl; img.style.display = ''; ph.style.display = 'none'; }
    else { img.style.display = 'none'; ph.style.display = ''; }

    document.getElementById('user-profile-stat-listened').textContent = u.totalListened ?? 0;
    document.getElementById('user-profile-stat-favorites').textContent = u.favoritesCount ?? 0;
    document.getElementById('user-profile-stat-playlists').textContent = (u.publicPlaylists || []).length;

    const genresWrap = document.getElementById('user-profile-top-genres-wrap');
    if(u.topGenres && u.topGenres.length){
      genresWrap.style.display = '';
      document.getElementById('user-profile-top-genres').innerHTML = u.topGenres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
    } else {
      genresWrap.style.display = 'none';
    }

    const plEmpty = document.getElementById('user-profile-playlists-empty');
    const plList = document.getElementById('user-profile-playlists-list');
    const playlists = u.publicPlaylists || [];
    plEmpty.style.display = playlists.length ? 'none' : '';
    plList.innerHTML = playlists.map(p=>`
      <div class="ext-search-item" onclick="openPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
      </div>`).join('');

    document.getElementById('user-profile-message-btn').style.display = u.relationshipStatus === 'self' ? 'none' : '';
    const btn = document.getElementById('user-profile-action-btn');
    if(u.relationshipStatus === 'self'){
      btn.style.display = 'none';
    } else if(u.relationshipStatus === 'friends'){
      btn.style.display = ''; btn.className = 'btn btn-outline active'; btn.textContent = t('friends.unfriendBtn');
      btn.onclick = () => unfriendUser(id);
    } else if(u.relationshipStatus === 'pending_outgoing'){
      btn.style.display = ''; btn.className = 'btn btn-outline'; btn.textContent = t('friends.cancelBtn');
      btn.onclick = () => { fetch('/api/friends/requests/outgoing').then(r=>r.ok?r.json():[]).then(list=>{
        const req = list.find(r=>r.userId===id); if(req) cancelOrRejectFriendRequest(req.requestId);
      }); };
    } else if(u.relationshipStatus === 'pending_incoming'){
      btn.style.display = ''; btn.className = 'btn btn-primary'; btn.textContent = t('friends.acceptBtn');
      btn.onclick = () => acceptFriendRequestFromUser(id);
    } else {
      btn.style.display = ''; btn.className = 'btn btn-primary'; btn.textContent = t('friends.addBtn');
      btn.onclick = () => sendFriendRequest(id);
    }
  }).catch(()=>{ document.getElementById('user-profile-not-found').style.display = ''; });
}
function onUserProfileActionClick(){ /* onclick встановлюється динамічно в loadUserProfilePage() */ }

function openBattleSetup(){
  const count = currentPlaylistSongs.length;
  const sizes = BATTLE_SIZES.filter(sz => count >= sz);
  const body = document.getElementById('battle-setup-body');
  if(!sizes.length){
    body.innerHTML = `<div class="modal-body-text">${t('battle.notEnough')}</div>`;
  } else {
    body.innerHTML = `<div class="modal-body-text">${t('battle.chooseSize')}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:6px;flex-wrap:wrap;">
        ${sizes.map(sz=>`<button type="button" class="btn btn-outline" onclick="startBattleRoyale(${sz})">${sz}</button>`).join('')}
      </div>`;
  }
  document.getElementById('battle-setup-modal-overlay').classList.add('open');
}
function closeBattleSetup(){
  _closeModalAnimated('battle-setup-modal-overlay');
}

function startBattleRoyale(size){
  if(typeof YT === 'undefined' || !YT.Player){
    // YouTube IFrame API міг ще не підвантажитись — пробуємо ще раз за секунду.
    setTimeout(()=>startBattleRoyale(size), 1000);
    return;
  }
  closeBattleSetup();
  battleRound = _shuffledCopy(currentPlaylistSongs).slice(0, size);
  battleWinners = [];
  battleMatchIndex = 0;
  battleInitialSize = size;
  battleTransitioning = false;
  // Ставимо головний плеєр на паузу на час турніру — щоб не було потрійного звуку.
  if(ytPlayer && ytReady){ try{ ytPlayer.pauseVideo(); }catch(e){} }
  if(playerMode === 'file') _pPause();
  document.getElementById('battle-champion').style.display = 'none';
  document.getElementById('battle-split').style.display = 'flex';
  document.getElementById('battle-modal-overlay').classList.add('open');
  _ensureBattlePlayers(()=>{ loadBattleMatch(); });
}

// YT.Player створюємо один раз і перевикористовуємо між матчами — перестворення
// iframe на кожен матч повільніше й дає спалахи "чорного екрана".
function _ensureBattlePlayers(cb){
  if(battlePlayersReady){
    // Слухачі наведення теж вішаємо лише один раз тут, інакше накопичувались би з кожним матчем.
    cb();
    return;
  }
  let readyCount = 0;
  function onEither(){ readyCount++; if(readyCount===2){ battlePlayersReady=true; _wireBattleHoverListeners(); cb(); } }
  // autoplay:0 + cueVideoById нижче — обидва відео лежать на паузі на початку раунду.
  // mute:0 — звук керується тим самим повзунком гучності, що й в основному плеєрі.
  // controls:1 — рідні контроли YouTube (плеєр лишається "чужим", свій
  // play/pause-оверлей і прогрес-бар прибрані на прохання користувача).
  battleLeftPlayer = new YT.Player('battle-yt-a', {
    height:'100%', width:'100%',
    playerVars:{autoplay:0, controls:1, mute:0},
    events:{ onReady:onEither, onStateChange: e => _onBattleStateChange('a', e) }
  });
  battleRightPlayer = new YT.Player('battle-yt-b', {
    height:'100%', width:'100%',
    playerVars:{autoplay:0, controls:1, mute:0},
    events:{ onReady:onEither, onStateChange: e => _onBattleStateChange('b', e) }
  });
}

function _onBattleStateChange(side, e){
  // cueVideoById скидає гучність/mute асинхронно ПІСЛЯ повернення виклику — тому
  // застосовуємо unMute/setVolume тут, коли CUED справді настав, а не одразу за cueVideoById.
  if(e.data === YT.PlayerState.CUED){
    try{ e.target.unMute(); e.target.setVolume(vol); }catch(err){}
  }
  // Двоє одночасно не мають грати: щойно один переходить у PLAYING — ставимо другий на паузу.
  if(e.data !== YT.PlayerState.PLAYING) return;
  const other = side === 'a' ? battleRightPlayer : battleLeftPlayer;
  try{ other && other.pauseVideo(); }catch(err){}
  _stopBattleMinis();
}

// "Режим наведення": навів курсор на відео — грає, вивів — пауза.
function toggleBattleHoverMode(){
  battleHoverModeActive = !battleHoverModeActive;
  document.getElementById('battle-hover-toggle-btn').classList.toggle('active', battleHoverModeActive);
}
function _wireBattleHoverListeners(){
  const wrapA = document.querySelector('#battle-yt-a').closest('.battle-video-wrap');
  const wrapB = document.querySelector('#battle-yt-b').closest('.battle-video-wrap');
  const wire = (wrap, getPlayer, side) => {
    wrap.addEventListener('mouseenter', () => {
      if(!battleHoverModeActive) return;
      if(_isBattleAudioSide(side)){ _battleAudio(side).play().catch(()=>{}); return; }
      try{ getPlayer().playVideo(); }catch(e){}
    });
    wrap.addEventListener('mouseleave', () => {
      if(!battleHoverModeActive) return;
      if(_isBattleAudioSide(side)){ _battleAudio(side).pause(); return; }
      try{ getPlayer().pauseVideo(); }catch(e){}
    });
  };
  wire(wrapA, () => battleLeftPlayer, 'a');
  wire(wrapB, () => battleRightPlayer, 'b');
}

// Стрічка прогресу: сегмент на кожен розмір раунду від старту до фіналу
// (16→8→4→2→1), поточний підсвічений, пройдені — позначені як завершені.
function _renderBattleProgress(){
  const el = document.getElementById('battle-progress-ribbon');
  if(!el || !battleInitialSize) return;
  const sizes = [];
  for(let s = battleInitialSize; s >= 1; s = s/2) sizes.push(s);
  el.innerHTML = sizes.map(s => {
    const cls = s === battleRound.length ? 'current' : (s > battleRound.length ? 'done' : '');
    return `<span class="battle-progress-seg ${cls}">${s}</span>`;
  }).join('<span class="battle-progress-sep"></span>');
}

async function loadBattleMatch(){
  _renderBattleProgress();
  const a = battleRound[battleMatchIndex*2];
  const b = battleRound[battleMatchIndex*2+1];
  document.getElementById('battle-round-label').textContent =
    `${t('battle.roundLabel')}${battleRound.length} → ${battleRound.length/2}`;
  document.getElementById('battle-a-artist').textContent = a.artist;
  document.getElementById('battle-a-title').textContent = a.title;
  document.getElementById('battle-b-artist').textContent = b.artist;
  document.getElementById('battle-b-title').textContent = b.title;
  document.getElementById('battle-a-notfound').style.display = 'none';
  document.getElementById('battle-b-notfound').style.display = 'none';

  _stopBattleMinis();
  const [vidA, vidB] = await Promise.all([_resolveBattleVid(a), _resolveBattleVid(b)]);
  _loadBattleSide(battleLeftPlayer, 'battle-a-notfound', vidA, 'a', a);
  _loadBattleSide(battleRightPlayer, 'battle-b-notfound', vidB, 'b', b);
}

// ─── Міні-плеєр батлу для треків ком'юніті без відео ─────────────────────
function _battleAudio(side){ return document.getElementById(`battle-audio-${side}`); }
function _battleWrap(side){ return document.getElementById(`battle-mini-${side}`).closest('.battle-video-wrap'); }
function _isBattleAudioSide(side){ return _battleWrap(side).classList.contains('audio-mode'); }
function _setBattleMiniMode(side, audioUrl){
  const audio = _battleAudio(side);
  _battleWrap(side).classList.toggle('audio-mode', !!audioUrl);
  if(audioUrl){ audio.src = audioUrl; audio.volume = vol/100; }
  else { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  _renderBattleMini(side);
}
function _stopBattleMinis(){ ['a','b'].forEach(s=>{ const au=_battleAudio(s); au.pause(); }); }
function _renderBattleMini(side){
  const audio = _battleAudio(side);
  const mini = document.getElementById(`battle-mini-${side}`);
  const d = isFinite(audio.duration) ? audio.duration : 0;
  mini.querySelector('.battle-mini-fill').style.width = d ? `${audio.currentTime/d*100}%` : '0%';
  mini.querySelector('.battle-mini-time').textContent = `${fmtSec(audio.currentTime)} / ${fmtSec(d)}`;
  mini.querySelector('.battle-mini-play use').setAttribute('href', audio.paused ? '#icon-play' : '#icon-pause');
  mini.classList.toggle('playing', !audio.paused);
}
function toggleBattleMini(side){
  const audio = _battleAudio(side);
  if(audio.paused) audio.play().catch(()=>{}); else audio.pause();
}
function seekBattleMini(side, e){
  const audio = _battleAudio(side);
  if(!isFinite(audio.duration)) return;
  const rect = e.currentTarget.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX-rect.left)/rect.width)) * audio.duration;
}
['a','b'].forEach(side=>{
  const audio = _battleAudio(side);
  ['timeupdate','pause','loadedmetadata','ended'].forEach(ev=>audio.addEventListener(ev, ()=>_renderBattleMini(side)));
  // Як і з відео: грає лише один бік — інший (відео чи міні-плеєр) на паузу.
  audio.addEventListener('play', ()=>{
    _renderBattleMini(side);
    const other = side === 'a' ? 'b' : 'a';
    _battleAudio(other).pause();
    try{ (side === 'a' ? battleRightPlayer : battleLeftPlayer)?.pauseVideo(); }catch(e){}
  });
});

async function _resolveBattleVid(song){
  if(song.youtubeVideoId) return song.youtubeVideoId;
  if(song.source === 'community') return null;
  const vid = await fetchVid(song.artist, song.title);
  if(vid) _cacheYoutubeVideo(song.id, vid);
  return vid;
}

function _loadBattleSide(player, notFoundElId, vid, side, song){
  // Трек ком'юніті лише з файлом — міні-плеєр замість "відео не знайдено".
  const audioOnly = !vid && song?.audioUrl;
  _setBattleMiniMode(side, audioOnly ? song.audioUrl : null);
  if(audioOnly){ try{ player.stopVideo(); }catch(e){} return; }
  if(!vid){
    try{ player.stopVideo(); }catch(e){}
    document.getElementById(notFoundElId).style.display = 'block';
    return;
  }
  // cueVideoById (не loadVideoById!) — завантажує кадр і лишає на паузі.
  player.cueVideoById(vid);
  // Початкова гучність — та сама, що в основному плеєрі (глобальна змінна vol).
  player.unMute();
  player.setVolume(vol);
}

function chooseBattleWinner(side){
  if(battleTransitioning) return;
  battleTransitioning = true;
  // Відео (в .battle-media-row) і інфо/кнопка (в .battle-details-row) тепер
  // окремі елементи для того самого боку — підсвічуємо/гасимо обидва разом.
  const videos = document.querySelectorAll('#battle-split .battle-video-wrap');
  const sides = document.querySelectorAll('#battle-split .battle-side');
  const flashEls = [videos[side], sides[side]];
  const fadeEls = [videos[1-side], sides[1-side]];
  flashEls.forEach(el => el?.classList.add('battle-winner-flash'));
  fadeEls.forEach(el => el?.classList.add('battle-loser-fade'));
  try{ battleLeftPlayer && battleLeftPlayer.pauseVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.pauseVideo(); }catch(e){}
  _stopBattleMinis();

  const winner = battleRound[battleMatchIndex*2 + side];
  battleWinners.push(winner);
  battleMatchIndex++;

  setTimeout(()=>{
    [...videos, ...sides].forEach(el => el.classList.remove('battle-winner-flash','battle-loser-fade'));
    battleTransitioning = false;
    if(battleMatchIndex*2 >= battleRound.length){
      if(battleWinners.length === 1){
        showBattleChampion(battleWinners[0]);
        return;
      }
      battleRound = battleWinners;
      battleWinners = [];
      battleMatchIndex = 0;
    }
    loadBattleMatch();
  }, 450);
}
// Клавіатура: ← / 1 — ліва пісня, → / 2 — права (лише поки турнір відкритий і йде матч, не чемпіон-екран).
document.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('battle-modal-overlay');
  if(!overlay || !overlay.classList.contains('open')) return;
  if(document.getElementById('battle-champion').style.display !== 'none') return;
  const tag = document.activeElement?.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA') return;
  if(e.key === 'ArrowLeft' || e.key === '1'){ e.preventDefault(); chooseBattleWinner(0); }
  else if(e.key === 'ArrowRight' || e.key === '2'){ e.preventDefault(); chooseBattleWinner(1); }
});

function showBattleChampion(song){
  try{ battleLeftPlayer && battleLeftPlayer.pauseVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.pauseVideo(); }catch(e){}
  battleChampionSong = song;
  document.getElementById('battle-champion-artist').textContent = song.artist;
  document.getElementById('battle-champion-title').textContent = song.title;
  document.getElementById('battle-split').style.display = 'none';
  document.getElementById('battle-champion').style.display = 'block';
  _battleConfetti();
  // Стрічка прогресу востаннє малювалась для матчу "2 → 1" (loadBattleMatch
  // більше не викликається після визначення чемпіона) — тож сегмент "1"
  // ніколи не підсвічувався, а "2" губив .current і лишався взагалі без
  // класу (не позначений завершеним, на відміну від 16/8/4). Проставляємо
  // все явно: усі, крім останнього, — .done; останній — .winner.
  const segs = document.querySelectorAll('#battle-progress-ribbon .battle-progress-seg');
  segs.forEach((seg, i) => {
    if(i === segs.length - 1){ seg.classList.remove('current', 'done'); seg.classList.add('winner'); }
    else { seg.classList.remove('current'); seg.classList.add('done'); }
  });
}
// Невеликий конфеті-вибух над карткою чемпіона — той самий прийом, що й на
// колесі фортуни (прості DOM-елементи з CSS-анімацією, самі прибираються).
function _battleConfetti(){
  const host = document.getElementById('battle-champion');
  if(!host) return;
  const colors = WHEEL_COLORS;
  for(let i=0; i<40; i++){
    const el = document.createElement('span');
    const angle = Math.random()*360;
    const dist = 80 + Math.random()*180;
    const dx = Math.cos(angle*Math.PI/180)*dist;
    const dy = Math.sin(angle*Math.PI/180)*dist;
    el.className = 'battle-confetti-piece';
    el.style.cssText = `top:38%;left:50%;width:${5+Math.random()*4}px;height:${5+Math.random()*4}px;` +
      `background:${colors[i%colors.length]};border-radius:${Math.random()<0.5?'50%':'2px'};` +
      `--dx:${dx}px;--dy:${dy}px;animation-duration:${0.7+Math.random()*0.5}s;`;
    host.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}
// "Слухати переможця" — закриває турнір і одразу вмикає переможну пісню в основному плеєрі.
function playBattleChampion(){
  if(!battleChampionSong) return;
  const champion = battleChampionSong;
  closeBattle();
  // Не playSong(id): той шукає пісню в поточній таблиці, а переможець —
  // з плейлиста й може бути з будь-якої таблиці (або з жодної відкритої).
  playerQueue = [champion];
  playerIndex = 0;
  _loadCurrent();
}

function closeBattle(){
  _closeModalAnimated('battle-modal-overlay');
  try{ battleLeftPlayer && battleLeftPlayer.stopVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.stopVideo(); }catch(e){}
  _stopBattleMinis();
}
document.getElementById('battle-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeBattle();
});
document.getElementById('battle-setup-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeBattleSetup();
});

// ================================================================
// ГРАФ СХОЖОСТІ: композиції / жанри / альбоми / сингли
// ================================================================
// Лінії малюємо лише для помітної схожості — інакше при N≈300+ вузлів вийшла б суцільна павутина.
const GRAPH_SIM_THRESHOLD = 0.15;
let _graphItems = [], _graphOnClick = null, _graphLabelFn = null, _graphAdj = [];
let _graphView = { x: 0, y: 0, scale: 1 };
let _graphHoveredIndex = null;
let _graphDragging = false, _graphDragStart = null;

function _graphApplyView(){
  const vp = document.getElementById('graph-viewport');
  if(vp) vp.setAttribute('transform', `translate(${_graphView.x},${_graphView.y}) scale(${_graphView.scale})`);
}
function _graphResetView(){
  _graphView = { x: 0, y: 0, scale: 1 };
  _graphApplyView();
}
function _graphZoomAt(px, py, factor){
  const newScale = Math.min(6, Math.max(0.4, _graphView.scale*factor));
  const f = newScale/_graphView.scale;
  _graphView.x = px - (px-_graphView.x)*f;
  _graphView.y = py - (py-_graphView.y)*f;
  _graphView.scale = newScale;
  _graphApplyView();
}
function _graphZoomBy(factor){
  const svg = document.getElementById('graph-svg');
  _graphZoomAt(svg.clientWidth/2, svg.clientHeight/2, factor);
}
(function(){
  const wrap = document.getElementById('graph-canvas-wrap');
  wrap.addEventListener('wheel', function(e){
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    _graphZoomAt(e.clientX-rect.left, e.clientY-rect.top, e.deltaY < 0 ? 1.15 : 1/1.15);
  }, { passive: false });
  wrap.addEventListener('mousedown', function(e){
    _graphDragging = true;
    _graphDragStart = { x: e.clientX, y: e.clientY, vx: _graphView.x, vy: _graphView.y };
    wrap.classList.add('panning');
  });
  window.addEventListener('mousemove', function(e){
    if(_graphDragging){
      _graphView.x = _graphDragStart.vx + (e.clientX-_graphDragStart.x);
      _graphView.y = _graphDragStart.vy + (e.clientY-_graphDragStart.y);
      _graphApplyView();
    }
    if(_graphHoveredIndex !== null){
      const rect = wrap.getBoundingClientRect();
      const tip = document.getElementById('graph-tooltip');
      tip.style.left = (e.clientX-rect.left) + 'px';
      tip.style.top = (e.clientY-rect.top) + 'px';
    }
  });
  window.addEventListener('mouseup', function(){
    _graphDragging = false;
    wrap.classList.remove('panning');
  });
})();
function _graphNodeHover(i){
  _graphHoveredIndex = i;
  document.getElementById('graph-svg').classList.add('has-hover');
  const nodeEls = document.querySelectorAll('#graph-viewport .graph-node');
  nodeEls[i]?.classList.add('hl');
  (_graphAdj[i] || []).forEach(j => nodeEls[j]?.classList.add('hl'));
  document.querySelectorAll('#graph-viewport .graph-edge').forEach(el => {
    if(+el.dataset.i === i || +el.dataset.j === i) el.classList.add('hl');
  });
  const tip = document.getElementById('graph-tooltip');
  tip.textContent = (_graphLabelFn && _graphItems[i]) ? _graphLabelFn(_graphItems[i]) : '';
  tip.classList.add('show');
}
function _graphNodeUnhover(){
  _graphHoveredIndex = null;
  document.getElementById('graph-svg').classList.remove('has-hover');
  document.querySelectorAll('#graph-viewport .hl').forEach(el => el.classList.remove('hl'));
  document.getElementById('graph-tooltip').classList.remove('show');
}

function _jaccard(setA, setB){
  if(!setA.size && !setB.size) return 0;
  let inter = 0;
  for(const x of setA) if(setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union ? inter/union : 0;
}
function _genreSet(song){ return new Set(song.genres.map(g=>g.toLowerCase())); }

function openSimilarityGraph(kind){
  let items, simFn, labelFn, colorFn, onClickFn, titleKey;

  if(kind === 'songs'){
    items = songs;
    const sets = items.map(_genreSet);
    simFn = (i,j) => _jaccard(sets[i], sets[j]);
    labelFn = s => `${s.artist} — ${s.title}`;
    colorFn = (s,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = s => { closeGraph(); playSong(s.id); };
    titleKey = 'graph.titleSongs';
  } else if(kind === 'genres'){
    const genreNames = [...new Set(songs.flatMap(s=>s.genres))];
    // Схожість жанрів = наскільки часто вони зустрічаються РАЗОМ у тих самих піснях.
    const songIdSets = genreNames.map(g => new Set(songs.filter(s=>s.genres.includes(g)).map(s=>s.id)));
    items = genreNames;
    simFn = (i,j) => _jaccard(songIdSets[i], songIdSets[j]);
    labelFn = g => abbrGenre(g);
    colorFn = (g,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = g => { closeGraph(); showPage('home'); document.getElementById('filter-genre').value = g; renderSongs(); };
    titleKey = 'graph.titleGenres';
  } else { // 'albums' | 'singles'
    let groups;
    if(kind === 'albums'){
      const map = new Map();
      songs.forEach(s=>{
        if(!s.album) return;
        if(!map.has(s.album)) map.set(s.album, { name: s.album, songs: [], artists: new Set() });
        const g = map.get(s.album);
        g.songs.push(s); g.artists.add(s.artist);
      });
      groups = [...map.values()];
    } else {
      groups = songs.filter(s=>!s.album).map(s => ({ name: `${s.artist} — ${s.title}`, songs: [s], artists: new Set([s.artist]) }));
    }
    items = groups;
    const genreSets = groups.map(g => {
      const set = new Set();
      g.songs.forEach(s => s.genres.forEach(gn => set.add(gn.toLowerCase())));
      return set;
    });
    // Схожість альбомів/синглів: насамперед жанровий профіль, той самий виконавець — лише другорядний бонус.
    simFn = (i,j) => {
      const genreSim = _jaccard(genreSets[i], genreSets[j]);
      const a1 = groups[i].artists, a2 = groups[j].artists;
      const sameArtist = (a1.size===1 && a2.size===1 && [...a1][0]===[...a2][0]) ? 1 : 0;
      return genreSim*0.8 + sameArtist*0.2;
    };
    labelFn = g => g.name;
    colorFn = (g,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = kind === 'albums'
      ? g => { closeGraph(); showPage('home'); document.getElementById('search').value = g.name; renderSongs(); }
      : g => { closeGraph(); playSong(g.songs[0].id); };
    titleKey = kind === 'albums' ? 'graph.titleAlbums' : 'graph.titleSingles';
  }

  document.getElementById('graph-title').textContent = t(titleKey);
  document.getElementById('graph-loading').style.display = 'block';
  document.getElementById('graph-viewport').innerHTML = '';
  _graphResetView();
  document.getElementById('graph-modal-overlay').classList.add('open');
  // Обчислення відкладаємо на наступний кадр — щоб встиг намалюватись стан "завантаження".
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      _renderGraph(items, simFn, labelFn, colorFn, onClickFn);
      document.getElementById('graph-loading').style.display = 'none';
    }, 20);
  });
}

function closeGraph(){
  _closeModalAnimated('graph-modal-overlay');
  _graphNodeUnhover();
}
document.getElementById('graph-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeGraph();
});

// Проста фізична симуляція (вузли відштовхуються завжди, притягуються пропорційно до схожості) — не MDS, але достатньо.
function _computeGraphLayout(n, sim, width, height){
  const nodes = [];
  for(let i=0;i<n;i++){
    const angle = (i/n)*Math.PI*2;
    const r = Math.min(width,height)*0.35;
    nodes.push({ x: width/2 + Math.cos(angle)*r, y: height/2 + Math.sin(angle)*r, vx:0, vy:0 });
  }
  const repelK = 5000, springK = 0.02, centerK = 0.004;
  const iterations = n > 200 ? 90 : 150;
  for(let iter=0; iter<iterations; iter++){
    for(let i=0;i<n;i++){
      let fx=0, fy=0;
      for(let j=0;j<n;j++){
        if(i===j) continue;
        const dx = nodes[i].x-nodes[j].x, dy = nodes[i].y-nodes[j].y;
        let distSq = dx*dx+dy*dy; if(distSq<4) distSq=4;
        const dist = Math.sqrt(distSq);
        const rep = repelK/distSq;
        fx += (dx/dist)*rep; fy += (dy/dist)*rep;
        const s = sim[i][j];
        if(s>0){
          const attract = springK*s*dist;
          fx -= (dx/dist)*attract; fy -= (dy/dist)*attract;
        }
      }
      fx += (width/2-nodes[i].x)*centerK;
      fy += (height/2-nodes[i].y)*centerK;
      nodes[i].vx = (nodes[i].vx+fx)*0.82;
      nodes[i].vy = (nodes[i].vy+fy)*0.82;
    }
    for(let i=0;i<n;i++){ nodes[i].x += nodes[i].vx; nodes[i].y += nodes[i].vy; }
  }
  // Відступ від країв, щоб вузли не малювались упритул до рамки.
  const pad = 20;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  nodes.forEach(p=>{ if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x; if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y; });
  const spanX = Math.max(1,maxX-minX), spanY = Math.max(1,maxY-minY);
  const sx = (width-pad*2)/spanX, sy = (height-pad*2)/spanY;
  const scale = Math.min(sx, sy, 1.4);
  nodes.forEach(p=>{
    p.x = pad + (p.x-minX)*scale;
    p.y = pad + (p.y-minY)*scale;
  });
  return nodes;
}

function _renderGraph(items, simFn, labelFn, colorFn, onClickFn){
  const n = items.length;
  const svg = document.getElementById('graph-svg');
  const viewport = document.getElementById('graph-viewport');
  const w = svg.clientWidth || 700, h = svg.clientHeight || 500;
  _graphItems = items; _graphOnClick = onClickFn; _graphLabelFn = labelFn; _graphAdj = [];
  if(!n){ viewport.innerHTML=''; return; }
  if(n===1){
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    viewport.innerHTML = `<g class="graph-node" onclick="_graphNodeClicked(0)" onmouseenter="_graphNodeHover(0)" onmouseleave="_graphNodeUnhover()"><circle cx="${w/2}" cy="${h/2}" r="9" fill="${colorFn(items[0],0)}"/></g>`;
    return;
  }

  const sim = new Array(n);
  for(let i=0;i<n;i++) sim[i] = new Array(n).fill(0);
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const s=simFn(i,j); sim[i][j]=s; sim[j][i]=s; }

  const nodes = _computeGraphLayout(n, sim, w, h);
  const radius = n>150 ? 3.5 : n>50 ? 6 : 9;

  _graphAdj = Array.from({length:n}, () => []);
  let edgesSvg = '';
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
    const s = sim[i][j];
    if(s < GRAPH_SIM_THRESHOLD) continue;
    _graphAdj[i].push(j); _graphAdj[j].push(i);
    edgesSvg += `<line class="graph-edge" data-i="${i}" data-j="${j}" x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${nodes[j].x.toFixed(1)}" y2="${nodes[j].y.toFixed(1)}" stroke="rgba(200,169,110,${Math.min(0.5, s*0.6).toFixed(2)})" stroke-width="${(1+s*2).toFixed(1)}" />`;
  }
  let nodesSvg = '';
  for(let i=0;i<n;i++){
    nodesSvg += `<g class="graph-node" onclick="_graphNodeClicked(${i})" onmouseenter="_graphNodeHover(${i})" onmouseleave="_graphNodeUnhover()"><circle cx="${nodes[i].x.toFixed(1)}" cy="${nodes[i].y.toFixed(1)}" r="${radius}" fill="${colorFn(items[i],i)}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/></g>`;
  }

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  viewport.innerHTML = edgesSvg + nodesSvg;
}
function _graphNodeClicked(i){
  if(_graphOnClick) _graphOnClick(_graphItems[i]);
}

// ================================================================
// TOP 100 (найпрослуханіші — GET /api/stats/top-songs)
// ================================================================
let currentTopSongs = [];
function playFromTop(id){
  if(!currentTopSongs.length) return;
  playerQueue=currentTopSongs.slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}
async function loadTopSongsPage(){
  const tbody=document.getElementById('top-songs-body');
  try{
    const list = await fetch('/api/stats/top-songs?limit=100').then(r=>r.json());
    currentTopSongs = list;
    if(!list.length){
      tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('top.empty')}</div></td></tr>`;
      return;
    }
    const curId=playerQueue.length&&playerQueue[playerIndex]?playerQueue[playerIndex].id:null;
    tbody.innerHTML=list.map((s,i)=>{
      const isPlay=s.id===curId;
      const btnIcon=isPlay&&isPlaying()
        ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
        :`<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      return `<tr class="${isPlay?'playing-row':''}">
        <td class="td-icon-lead" data-label="" style="padding:0.7rem 0.5rem 0.7rem 1rem;">
          <button class="play-row-btn${isPlay?' is-playing':''}" onclick="toggleOrPlay(${s.id}, playFromTop)">${btnIcon}</button>
        </td>
        <td class="num-col" data-label="${t('table.number')}">${i+1}</td>
        <td data-label="${t('table.artist')}"><strong>${artistLinksHtml(s)}</strong></td>
        <td data-label="${t('table.title')}">${esc(s.title)}</td>
        <td data-label="${t('table.album')}">${s.album?`<span class="badge album">${esc(s.album)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
        <td class="duration-col" data-label="${t('table.plays')}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount ?? 0}</td>
      </tr>`;
    }).join('');
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('top.empty')}</div></td></tr>`;
  }
}

function _loadCurrent(){
  const s=playerQueue[playerIndex];if(!s)return;
  listenLogged=false;
  userIntendedPlaying=true;
  document.getElementById('p-title').textContent=s.title;
  document.getElementById('p-artist').innerHTML=artistLinksHtml(s);
  document.getElementById('p-album').textContent=s.album||t('table.single');
  document.getElementById('player-cover-img').style.display='none';
  document.getElementById('player-cover-ph').style.display='block';
  document.getElementById('player-bar').classList.add('visible');
  document.body.classList.add('player-open');
  document.getElementById('btn-edit-current').style.display = currentUser?.isAdmin ? '' : 'none';
  const favBtn = document.getElementById('btn-fav-current');
  const plBtn = document.getElementById('btn-playlist-current');
  favBtn.style.display = currentUser?.authenticated ? '' : 'none';
  plBtn.style.display = currentUser?.authenticated ? '' : 'none';
  favBtn.classList.toggle('active', favoriteIds.has(s.id));
  favBtn.querySelector('svg').setAttribute('fill', favoriteIds.has(s.id) ? 'currentColor' : 'none');
  document.getElementById('btn-rate-current').style.display = '';
  setLoad(true);setEQ(false);setPP(false);
  document.getElementById('player-seek-filled').style.width='0%';
  document.getElementById('player-seek-thumb').style.left='0%';
  document.getElementById('p-cur').textContent='0:00';
  document.getElementById('p-dur').textContent='0:00';

  // Пісня таблиці_2 з завантаженим файлом — грає власний <audio>, без YouTube.
  if(s.audioUrl){
    if(playerMode==='yt'){ try{ if(ytPlayer&&ytReady) ytPlayer.stopVideo(); }catch(e){} }
    if(videoPopupOpen) closeVideoPopup();
    playerMode='file';
    currentVid=null;
    document.getElementById('btn-video').classList.add('disabled');
    renderSongs();
    if(karaokeOpen) loadKaraokeLyrics();
    _updateMediaSessionMetadata(s, null);
    fileAudio.volume = vol/100;
    fileAudio.src = s.audioUrl;
    fileAudio.play().catch(()=>{ setLoad(false); setPP(false); });
    return;
  }
  if(playerMode==='file') _stopFileAudio();
  playerMode='yt';
  document.getElementById('btn-video').classList.remove('disabled');
  renderSongs();
  if(karaokeOpen) loadKaraokeLyrics();

  // Якщо videoId вже закешовано в базі — беремо напряму, без нового запиту до YouTube Search API.
  // Ком'юніті-пісні не шукаємо автоматично: відео до них вказує лише автор/адмін.
  const vidPromise = s.youtubeVideoId
    ? Promise.resolve(s.youtubeVideoId)
    : s.source === 'community' ? Promise.resolve(null)
    : fetchVid(s.artist,s.title).then(vid=>{
        if(vid) _cacheYoutubeVideo(s.id, vid);
        return vid;
      });

  _updateMediaSessionMetadata(s, null);

  vidPromise.then(vid=>{
    if(!vid){setLoad(false);document.getElementById('p-title').textContent=s.title+t('video.notFoundSuffix');return;}
    currentVid = vid;
    _onVidReady(vid);
    const img=document.getElementById('player-cover-img');
    img.src='https://img.youtube.com/vi/'+vid+'/mqdefault.jpg';
    img.style.display='block';
    _applyArtworkColor(vid);
    document.getElementById('player-cover-ph').style.display='none';
    _updateMediaSessionMetadata(s, vid);
    if(ytReady)_load(vid);else pendingVid=vid;
    // Нативний попап (Electron) не підхоплює зміну пісні сам — без цього
    // лишалось би старе відео, а нове тим часом почало б грати ще й тут (два звуки одразу).
    if(_electronPopoutActive&&window.electronAPI?.openVideoPopout)window.electronAPI.openVideoPopout(vid,0,vol,false);
  });
}
// Фонове збереження знайденого videoId — не блокує відтворення, best-effort.
function _cacheYoutubeVideo(songId, videoId){
  fetch(`/api/songs/${songId}/youtube-video`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({videoId})
  }).catch(()=>{});
}

// Нормалізація для звірки релевантності: без регістру, діакритики й пунктуації.
function _normForMatch(s){
  return (s||'').toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .replace(new RegExp('[^a-z0-9\\u0400-\\u04FF\\s]','g'),' ')
    .replace(/\s+/g,' ').trim();
}
function _significantWords(s){
  return _normForMatch(s).split(' ').filter(w=>w.length>2);
}
// Відео справді про ЦЮ пісню — вимагаємо, щоб більшість значущих слів із назви пісні були в назві відео.
function _isRelevantVideo(item,title){
  const nItem=_normForMatch(item.snippet?.title);
  const titleWords=_significantWords(title);
  if(!titleWords.length) return true;
  const matched=titleWords.filter(w=>nItem.includes(w)).length;
  return (matched/titleWords.length) >= 0.6;
}
async function _searchYoutube(q){
  // Пробуємо ключі по черзі — якщо один вичерпав денну квоту (403/429), переходимо на наступний.
  for(let attempt=0; attempt<ytApiKeys.length; attempt++){
    const key=ytApiKeys[ytApiKeyIdx];
    try{
      const r=await fetch(
        // maxResults=10 — більший пул кандидатів для відсіювання перезаливів.
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(q)}&key=${key}`,
        {signal:AbortSignal.timeout(8000)}
      );
      if(r.ok){
        const d=await r.json();
        return d.items||[];
      }
      if((r.status===403||r.status===429) && ytApiKeys.length>1){
        ytApiKeyIdx=(ytApiKeyIdx+1)%ytApiKeys.length;
        continue; // квота — пробуємо наступний ключ
      }
      return []; // інша помилка (мережа/невалідний ключ) — сенсу пробувати ще нема
    }catch(e){ return []; }
  }
  return []; // усі ключі вичерпали квоту
}
async function fetchVid(artist,title){
  if(!ytApiKeys.length) return null;
  const artistLower=artist.toLowerCase();
  // "live"/"interview"/"teaser" тощо проходять перевірку релевантності, але не є студійною піснею.
  const badWords=['cover','reaction','lyric','lyrics','8d audio','slowed','reverb','nightcore','1 hour','remix','karaoke','instrumental','tiktok','sped up','unofficial','fan made','fan-made','bootleg','live','interview','making of','teaser','behind the scenes','performance','acoustic'];

  function scoreItem(item){
    const t=(item.snippet?.title||'').toLowerCase();
    const ch=(item.snippet?.channelTitle||'').toLowerCase();
    // Канал артиста, VEVO, авто-канал "Artist - Topic" або "official" в назві — ознаки офіційного джерела.
    const channelLooksOfficial = ch.includes(artistLower)||ch.includes('vevo')||ch.includes(' - topic')||ch.includes('official');
    let s=0;
    if(channelLooksOfficial) s+=4;
    // "official video" у назві саме по собі нічого не гарантує — довіряємо лише коли канал справді офіційний.
    if(t.includes('official video')||t.includes('official music video')) s+=channelLooksOfficial?2:-2;
    else if(t.includes('official')) s+=channelLooksOfficial?1:-1;
    if(badWords.some(w=>t.includes(w))) s-=5;
    return s;
  }

  try{
    let items=await _searchYoutube(`${artist} ${title} official video`);
    let relevant=items.filter(it=>_isRelevantVideo(it,title));
    if(!relevant.length){
      // Друга спроба без "official video" — деякі малі канали не використовують цю фразу.
      items=await _searchYoutube(`${artist} ${title}`);
      relevant=items.filter(it=>_isRelevantVideo(it,title));
    }
    if(!relevant.length) return null; // краще "відео не знайдено", ніж програти не ту пісню

    const best=relevant.sort((a,b)=>scoreItem(b)-scoreItem(a))[0];
    return best.id.videoId;
  }catch(e){}
  return null;
}

function _load(vid){
  ytPlayer.loadVideoById(vid);
  // loadVideoById завжди стартує відтворення, ігноруючи autoplay:0 — коли звук
  // веде нативний попап (Electron), одразу глушимо тут, інакше грає з двох вікон.
  if(_electronPopoutActive)try{ytPlayer.pauseVideo();}catch(e){}
}

function playerToggle(){
  if(playerMode==='file'){ if(fileAudio.paused) _pPlay(); else _pPause(); return; }
  if(!ytPlayer||!ytReady)return;
  const st=ytPlayer.getPlayerState();
  if(st===YT.PlayerState.PLAYING)ytPlayer.pauseVideo();
  else ytPlayer.playVideo();
}

function playerNext(){
  if(!playerQueue.length)return;
  if(shuffle)playerIndex=Math.floor(Math.random()*playerQueue.length);
  else playerIndex=(playerIndex+1)%playerQueue.length;
  _loadCurrent();
}

function playerPrev(){
  if(!playerQueue.length)return;
  try{if(_pReady()&&_pTime()>3){_pSeek(0);return;}}catch(e){}
  playerIndex=(playerIndex-1+playerQueue.length)%playerQueue.length;
  _loadCurrent();
}

// ================================================================
// MEDIA SESSION (апаратні клавіші відтворення, системний "зараз грає" оверлей ОС) — працює навіть поза фокусом.
// ================================================================
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('play', _pPlay);
  navigator.mediaSession.setActionHandler('pause', _pPause);
  navigator.mediaSession.setActionHandler('previoustrack', playerPrev);
  navigator.mediaSession.setActionHandler('nexttrack', playerNext);
  navigator.mediaSession.setActionHandler('stop', playerClose);
}
function _updateMediaSessionMetadata(song, videoId){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album || '',
    artwork: videoId ? [
      {src:`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, sizes:'320x180', type:'image/jpeg'},
      {src:`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, sizes:'480x360', type:'image/jpeg'}
    ] : []
  });
}

function playerClose(){
  if(videoPopupOpen) closeVideoPopup();
  if(karaokeOpen) toggleKaraoke();
  try{if(ytPlayer&&ytReady)ytPlayer.stopVideo();}catch(e){}
  _stopFileAudio();
  playerMode='yt';
  stopTick();setEQ(false);
  currentVid = null;
  document.getElementById('btn-rate-current').style.display = 'none';
  document.getElementById('player-bar').classList.remove('visible');
  document.body.classList.remove('player-open');
  _applyArtworkColor(null);
  document.documentElement.removeAttribute('data-playing');
  _setGlowProgress(0);
  playerQueue=[];renderSongs();
  if('mediaSession' in navigator){ navigator.mediaSession.playbackState='none'; navigator.mediaSession.metadata=null; }
  const anchor = document.getElementById('ms-anchor');
  if(anchor) anchor.pause();
}

function toggleShuffle(){shuffle=!shuffle;document.getElementById('btn-shuffle').classList.toggle('lit',shuffle);}
function toggleRepeat(){repeat=!repeat;document.getElementById('btn-repeat').classList.toggle('lit',repeat);}

function setVolume(v){
  vol=parseInt(v);
  localStorage.setItem('volume', vol);
  if(ytPlayer&&ytReady)try{ytPlayer.setVolume(vol);}catch(e){}
  fileAudio.volume = vol/100;
  document.getElementById('vw1').style.display=vol===0?'none':'';
  document.getElementById('vw2').style.display=vol<50?'none':'';
  // Взаємодія з контролами іноді "оживляє" гучність попап-плеєра назад — глушимо знову.
  if(videoPopupOpen&&popupPlayer&&popupReady)try{popupPlayer.mute();}catch(e){}
  // Нативний попап (Electron) грає звук сам, окремим вікном/процесом — синхронізуємо його гучність теж.
  if(_electronPopoutActive&&window.electronAPI?.setPopoutVolume)window.electronAPI.setPopoutVolume(vol);
}

// SEEK
function seekStart(e){
  seekDrag=true;seekMove(e);
  document.addEventListener('mousemove',seekMove);
  document.addEventListener('mouseup',seekEnd);
  document.addEventListener('touchmove',seekMove,{passive:false});
  document.addEventListener('touchend',seekEnd);
}
function seekMove(e){
  if(!seekDrag)return;
  if(e.preventDefault)e.preventDefault();
  const wrap=document.getElementById('player-seek-wrap');
  const rect=wrap.getBoundingClientRect();
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  const pct=Math.max(0,Math.min(1,(cx-rect.left)/rect.width))*100;
  document.getElementById('player-seek-filled').style.width=pct+'%';
  document.getElementById('player-seek-thumb').style.left=pct+'%';
  try{if(_pReady())document.getElementById('p-cur').textContent=fmtSec(_pDuration()*pct/100);}catch(e){}
}
function seekEnd(e){
  seekDrag=false;
  document.removeEventListener('mousemove',seekMove);
  document.removeEventListener('mouseup',seekEnd);
  document.removeEventListener('touchmove',seekMove);
  document.removeEventListener('touchend',seekEnd);
  if(!_pReady())return;
  const wrap=document.getElementById('player-seek-wrap');
  const rect=wrap.getBoundingClientRect();
  const cx=e.changedTouches?e.changedTouches[0].clientX:(e.clientX||0);
  const pct=Math.max(0,Math.min(1,(cx-rect.left)/rect.width));
  try{_pSeek(_pDuration()*pct);}catch(ex){}
}

function startTick(){
  stopTick();
  ticker=setInterval(()=>{
    if(!_pReady()||seekDrag)return;
    try{
      const c=_pTime(),d=_pDuration();
      if(d>0){
        const p=(c/d*100).toFixed(2);
        document.getElementById('player-seek-filled').style.width=p+'%';
        document.getElementById('player-seek-thumb').style.left=p+'%';
        document.getElementById('p-cur').textContent=fmtSec(c);
        _setGlowProgress(p);

        // Зараховуємо як прослухану після 20с або половини тривалості (що раніше).
        if(!listenLogged && currentUser?.authenticated){
          const threshold=Math.min(20,d/2);
          if(c>=threshold){
            listenLogged=true;
            const s=playerQueue[playerIndex];
            if(s) fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({musicId:s.id})}).catch(()=>{});
          }
        }
      }
    }catch(e){}
  },500);
}
function stopTick(){if(ticker){clearInterval(ticker);ticker=null;}}

function setPP(playing){
  document.getElementById('ico-play').style.display=playing?'none':'';
  document.getElementById('ico-pause').style.display=playing?'':'none';
  if('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  // Без власного елемента, що теж "грає", Chrome віддає активну media session чужому iframe (youtube.com).
  const anchor = document.getElementById('ms-anchor');
  if(anchor){ if(playing) anchor.play().catch(()=>{}); else anchor.pause(); }
}
function setLoad(on){document.getElementById('p-loading').style.display=on?'inline':'none';}
function setEQ(on){
  document.getElementById('player-cover-eq').classList.toggle('on',on);
  document.getElementById('player-cover').classList.toggle('glow',on);
  // Сяйво сторінки "дихає", поки грає, і тьмяніє на паузі.
  document.documentElement.toggleAttribute('data-playing', !!on);
}
// Прогрес пісні → "комета" в плеєрі (--p) і в сяйві сторінки (--pn, 0..1).
function _setGlowProgress(pct){
  const bar = document.getElementById('player-bar');
  if(bar) bar.style.setProperty('--p', pct + '%');
  const amb = document.getElementById('ambient');
  if(amb) amb.style.setProperty('--pn', (pct / 100).toFixed(4));
}


// ================================================================
// VIDEO POPUP
// ================================================================
// Два плеєри: ytPlayer (аудіо, прихований, завжди грає) і popupPlayer (відео в попапі, синхронізоване, без звуку).
let videoPopupOpen = false;
let currentVid = null;
let popupPlayer = null;
let popupReady = false;
let popupSyncTicker = null;
// true одразу після нашого ж programmatic seekTo() — YouTube може емітити короткий
// спурний PLAYING, який не відрізнити від справжнього без цього прапорця.
let _popupProgrammaticSeek = false;
function _popupSeek(time){
  _popupProgrammaticSeek = true;
  try { popupPlayer.seekTo(time, true); } catch(e) {}
  setTimeout(() => { _popupProgrammaticSeek = false; }, 400);
}

// Ініціалізуємо прихований div для popup-плеєра (вже є #video-popup-frame).
function _initPopupPlayer(vid, startAt) {
  const frame = document.getElementById('video-popup-frame');
  const loading = document.getElementById('video-popup-loading');
  loading.style.display = 'flex';

  // Знищуємо попередній якщо є
  if (popupPlayer) {
    try { popupPlayer.destroy(); } catch(e) {}
    popupPlayer = null;
    popupReady = false;
  }

  // Контейнер для нового плеєра
  let ph = document.getElementById('popup-player-ph');
  if (!ph) {
    ph = document.createElement('div');
    ph.id = 'popup-player-ph';
    frame.appendChild(ph);
  }

  popupPlayer = new YT.Player('popup-player-ph', {
    width: '100%',
    height: '100%',
    videoId: vid,
    // controls:0 — звук завжди йде з ytPlayer; нативний повзунок гучності міг
    // розглушувати popupPlayer в обхід нашого mute(), тож прибираємо контроли взагалі.
    playerVars: {
      autoplay: userIntendedPlaying ? 1 : 0,
      start: Math.floor(startAt || 0),
      controls: 0,
      disablekb: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3
    },
    events: {
      onReady: (e) => {
        popupReady = true;
        loading.style.display = 'none';
        // Точне вирівнювання по секунді з основним плеєром
        try {
          const cur = ytPlayer.getCurrentTime();
          _popupSeek(cur);
          e.target.mute(); // відео без звуку — звук іде з ytPlayer (setVolume(0) саму по собі YouTube іноді "забуває")
          e.target.setVolume(0);
          // Якщо музика на паузі — не даємо autoplay стартувати попап.
          if(!userIntendedPlaying) e.target.pauseVideo();
        } catch(ex) {}
        _startPopupSync();
      },
      onStateChange: (e) => {
        // Якщо хтось натиснув паузу у відео — синхронізуємо основний плеєр
        if (e.data === YT.PlayerState.PAUSED) {
          userIntendedPlaying = false;
          try { if(ytPlayer&&ytReady) ytPlayer.pauseVideo(); } catch(ex) {}
          setPP(false); stopTick(); setEQ(false);
        } else if (e.data === YT.PlayerState.PLAYING) {
          if (_popupProgrammaticSeek) {
            // Спурний PLAYING від НАШОГО Ж seekTo() (ініціалізація/синк), а не
            // від користувача — повертаємо попап у той стан, що й мав бути.
            if (!userIntendedPlaying) { try { popupPlayer.pauseVideo(); } catch(ex) {} }
            return;
          }
          // Справжній клік користувача по відео — і перший play, і "продовжити" після паузи.
          userIntendedPlaying = true;
          try { if(ytPlayer&&ytReady) {
            ytPlayer.seekTo(popupPlayer.getCurrentTime(), true);
            ytPlayer.playVideo();
          }} catch(ex) {}
          try { popupPlayer.mute(); } catch(ex) {} // повторно глушимо — саме на PLAYING звук іноді "повертається"
          setPP(true); startTick(); setEQ(true);
        }
      }
    }
  });
}

// Кожні 5 сек вирівнюємо popup по ytPlayer (компенсує дрейф)
function _startPopupSync() {
  _stopPopupSync();
  popupSyncTicker = setInterval(() => {
    if (!popupReady || !ytReady) return;
    try {
      // Якщо музика на паузі — попап теж має бути на паузі (без цього продовжував грати
      // й через onStateChange "оживляв" звук назад).
      if (!userIntendedPlaying) {
        if (popupPlayer.getPlayerState() === YT.PlayerState.PLAYING) popupPlayer.pauseVideo();
        return;
      }
      // Періодично перепідтверджуємо мут — за спостереженнями, після взаємодії
      // зі слайдером гучності попап іноді "розглушується" сам по собі.
      if (!popupPlayer.isMuted()) popupPlayer.mute();
      const mainTime = ytPlayer.getCurrentTime();
      const popTime  = popupPlayer.getCurrentTime();
      if (Math.abs(mainTime - popTime) > 1.5) {
        _popupSeek(mainTime);
      }
    } catch(e) {}
  }, 5000);
}

function _stopPopupSync() {
  if (popupSyncTicker) { clearInterval(popupSyncTicker); popupSyncTicker = null; }
}

function toggleVideoPopup() {
  if (playerMode === 'file') return; // файл пісні без відео
  if (videoPopupOpen) closeVideoPopup();
  else openVideoPopup();
}

// ================================================================
// КАРАОКЕ: текст поточної пісні (вводить вручну адмін — див. edit-song-lyrics)
// ================================================================
let karaokeOpen = false;
function toggleKaraoke(){
  karaokeOpen = !karaokeOpen;
  document.getElementById('karaoke-panel').classList.toggle('open', karaokeOpen);
  document.getElementById('btn-karaoke').classList.toggle('active', karaokeOpen);
  if(karaokeOpen) loadKaraokeLyrics();
}
function loadKaraokeLyrics(){
  const textEl = document.getElementById('karaoke-text');
  const emptyEl = document.getElementById('karaoke-empty');
  const s = playerQueue[playerIndex];
  textEl.textContent = '';
  emptyEl.style.display = 'none';
  if(!s) return;
  fetch(`/api/songs/${s.id}/lyrics`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      const text = d && d.lyrics ? d.lyrics : '';
      if(!text){ emptyEl.style.display = 'block'; return; }
      textEl.textContent = text;
    })
    .catch(() => { emptyEl.style.display = 'block'; });
}

// ================================================================
// VIDEO POPUP: перенесення в окреме вікно ОС (Document Picture-in-Picture)
// ================================================================
// Document Picture-in-Picture прибрано з веб-версії — фонове відтворення воно
// не рятує (YouTube-embed так само призупиняється у фоні), а лише "перенести на
// інший монітор" не варте повторюваних багів. У Electron лишається справжнє
// нативне вікно ОС через window.electronAPI — геть інший, надійніший механізм.
let _electronPopoutActive = false;
if (window.electronAPI && window.electronAPI.onVideoPopoutClosed) {
  window.electronAPI.onVideoPopoutClosed(() => {
    _electronPopoutActive = false;
    document.getElementById('btn-video')?.classList.remove('active');
  });
}

function _updatePopoutBtnVisibility(){
  const btn = document.getElementById('video-popup-popout');
  const supported = !!(window.electronAPI && window.electronAPI.openVideoPopout);
  if (btn) btn.style.display = supported ? '' : 'none';
}

async function popOutVideoPopup(){
  if (_electronPopoutActive) return;
  if (!(window.electronAPI && window.electronAPI.openVideoPopout)) return;

  if (!currentVid) return;
  let startAt = 0;
  try { if (ytPlayer && ytReady) startAt = ytPlayer.getCurrentTime(); } catch(e) {}
  const ok = await window.electronAPI.openVideoPopout(currentVid, startAt, vol);
  if (ok) {
    _electronPopoutActive = true;
    document.getElementById('video-popup').classList.remove('open');
  }
}

// ================================================================
// VIDEO POPUP: розгортання розміру й перетягування по екрану
// ================================================================
function toggleVideoPopupFullscreen(){
  const popup = document.getElementById('video-popup');
  if (!document.fullscreenElement) {
    popup.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}
// Fullscreen API ховає все, що НЕ є нащадком fullscreen-елемента — тому на час
// fullscreen фізично переносимо вузол плеєр-бару всередину попапу, а після виходу повертаємо назад.
document.addEventListener('fullscreenchange', () => {
  const popup = document.getElementById('video-popup');
  const playerBar = document.getElementById('player-bar');
  const isFs = document.fullscreenElement === popup;
  document.getElementById('video-popup-fullscreen').classList.toggle('active', isFs);
  if (isFs) popup.appendChild(playerBar);
  else document.body.appendChild(playerBar);
});

let videoPopupExpanded = false;
function toggleVideoPopupSize(){
  videoPopupExpanded = !videoPopupExpanded;
  const popup = document.getElementById('video-popup');
  const header = document.getElementById('video-popup-header');
  // Явно перезаписуємо width/height — інакше inline-стиль від ручного перетягування переміг би клас.
  const rect = popup.getBoundingClientRect();
  const targetW = videoPopupExpanded ? Math.min(720, window.innerWidth * 0.9) : 320;
  const targetH = Math.round(targetW * 9 / 16) + header.offsetHeight;
  // Попап за замовчуванням прив'язаний right/bottom — ростимо від поточного
  // правого-нижнього кута явними left/top, щоб не виштовхувати його за межі viewport.
  let newLeft = rect.right - targetW;
  let newTop = rect.bottom - targetH;
  newLeft = Math.max(8, Math.min(newLeft, window.innerWidth - targetW - 8));
  newTop = Math.max(8, Math.min(newTop, window.innerHeight - targetH - 8));
  popup.style.right = 'auto';
  popup.style.bottom = 'auto';
  popup.style.left = newLeft + 'px';
  popup.style.top = newTop + 'px';
  popup.style.width = targetW + 'px';
  popup.style.height = targetH + 'px';
  document.getElementById('video-popup-expand').classList.toggle('active', videoPopupExpanded);
}

(function initVideoPopupResize(){
  const popup = document.getElementById('video-popup');
  const MIN_W = 220, MIN_H = 160;

  document.querySelectorAll('.vp-resize').forEach((handle) => {
    const dir = handle.dataset.dir; // 'n','s','e','w','ne','nw','se','sw'
    let dragging = false, startX = 0, startY = 0, startRect = null;

    handle.addEventListener('pointerdown', (e) => {
      if (document.fullscreenElement) return; // у fullscreen розмір фіксований
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startRect = popup.getBoundingClientRect();
      // Фіксуємо left/top ОДРАЗУ (а не лише скидаємо right/bottom) — інакше
      // між pointerdown і першим pointermove попап на мить "стрибне" в
      // позицію за замовчуванням.
      popup.style.left = startRect.left + 'px';
      popup.style.top = startRect.top + 'px';
      popup.style.right = 'auto';
      popup.style.bottom = 'auto';
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation(); // не даємо це ж pointerdown зачепити перетягування за шапку
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let width = startRect.width, height = startRect.height;
      let left = startRect.left, top = startRect.top;

      if (dir.includes('e')) width = startRect.width + dx;
      if (dir.includes('w')) width = startRect.width - dx;
      if (dir.includes('s')) height = startRect.height + dy;
      if (dir.includes('n')) height = startRect.height - dy;

      width = Math.max(MIN_W, Math.min(window.innerWidth * 0.98, width));
      height = Math.max(MIN_H, Math.min(window.innerHeight * 0.98, height));

      // Протилежний (нерухомий) край лишається на місці — координату рахуємо від нього.
      if (dir.includes('w')) left = startRect.right - width;
      if (dir.includes('n')) top = startRect.bottom - height;

      // Притискаємо до 0 — інакше шапка (єдина "ручка" переміщення) могла б виштовхнутись за екран.
      if (dir.includes('n') && top < 0) { height += top; top = 0; }
      if (dir.includes('w') && left < 0) { width += left; left = 0; }

      popup.style.width = width + 'px';
      popup.style.height = height + 'px';
      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
    });
    const endDrag = (e) => {
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch(ex) {}
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  });
})();

(function initVideoPopupDrag(){
  const popup = document.getElementById('video-popup');
  const header = document.getElementById('video-popup-header');
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; // не тягнемо, якщо клік по кнопці
    const rect = popup.getBoundingClientRect();
    // Переходимо з bottom/right-позиціювання на top/left, щоб рахувати зсув однаково.
    popup.style.left = rect.left + 'px';
    popup.style.top = rect.top + 'px';
    popup.style.right = 'auto';
    popup.style.bottom = 'auto';
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    header.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  header.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = popup.getBoundingClientRect();
    const margin = 40; // лишаємо хоч трохи попапу видимим за краєм екрана
    let newLeft = startLeft + (e.clientX - startX);
    let newTop = startTop + (e.clientY - startY);
    newLeft = Math.max(margin - rect.width, Math.min(window.innerWidth - margin, newLeft));
    newTop = Math.max(0, Math.min(window.innerHeight - margin, newTop));
    popup.style.left = newLeft + 'px';
    popup.style.top = newTop + 'px';
  });
  const endDrag = (e) => {
    dragging = false;
    try { header.releasePointerCapture(e.pointerId); } catch(ex) {}
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
})();

function openVideoPopup() {
  if (!currentVid) return;
  videoPopupOpen = true;
  document.getElementById('video-popup').classList.add('open');
  document.getElementById('btn-video').classList.add('active');

  let startAt = 0;
  try { if (ytPlayer && ytReady) startAt = ytPlayer.getCurrentTime(); } catch(e) {}
  _initPopupPlayer(currentVid, startAt);
}

function closeVideoPopup() {
  if (_electronPopoutActive && window.electronAPI?.closeVideoPopout) {
    window.electronAPI.closeVideoPopout();
    _electronPopoutActive = false;
  }

  const popup = document.getElementById('video-popup');

  // Спершу ГАРАНТОВАНО виходимо з fullscreen, і лише потім ховаємо попап — інакше браузер "зависає".
  if (document.fullscreenElement === popup) {
    document.exitFullscreen?.().catch(() => {}).finally(_finishCloseVideoPopup);
  } else {
    _finishCloseVideoPopup();
  }
}
function _finishCloseVideoPopup() {
  videoPopupOpen = false;
  document.getElementById('video-popup').classList.remove('open');
  document.getElementById('btn-video').classList.remove('active');
  _stopPopupSync();

  // Зупиняємо popup-плеєр — основний ytPlayer НЕ чіпаємо
  if (popupPlayer) {
    try { popupPlayer.destroy(); } catch(e) {}
    popupPlayer = null;
    popupReady = false;
  }

  // Відновлюємо placeholder для наступного разу
  const frame = document.getElementById('video-popup-frame');
  let ph = document.getElementById('popup-player-ph');
  if (!ph) { ph = document.createElement('div'); ph.id='popup-player-ph'; frame.appendChild(ph); }
  document.getElementById('video-popup-loading').style.display = 'flex';
}

function _onVidReady(vid) {
  currentVid = vid;
  // Якщо попап відкритий — оновлюємо відео в ньому з позиції 0
  if (videoPopupOpen) {
    let startAt = 0;
    try { if (ytPlayer && ytReady) startAt = ytPlayer.getCurrentTime(); } catch(e) {}
    _initPopupPlayer(vid, startAt);
  }
}

// ================================================================
// ГОЛОВНА ТАБЛИЦЯ_2 (пісні від ком'юніті) — та сама сторінка "Головна",
// перемикач лише змінює, яку з двох таблиць показувати.
// ================================================================
function showHome(source){
  source = source === 'community' ? 'community' : 'catalog';
  if(source !== homeSource){
    homeSource = source;
    // Перемішування — порядок конкретної таблиці, в іншій воно не має сенсу.
    if(shuffleActive) toggleShuffleTable();
    document.getElementById('filter-genre').value = '';
  }
  _applyHomeSourceUi();
  showPage('home');
}
function _applyHomeSourceUi(){
  const isCommunity = homeSource === 'community';
  document.getElementById('home-source-catalog').classList.toggle('active', !isCommunity);
  document.getElementById('home-source-community').classList.toggle('active', isCommunity);
  document.getElementById('th-submitter').style.display = isCommunity ? '' : 'none';
  document.getElementById('home-community-hint').style.display = isCommunity ? '' : 'none';
  const pre = document.getElementById('home-heading-pre');
  const accent = document.getElementById('home-heading-accent');
  const addBtn = document.getElementById('home-add-btn');
  pre.setAttribute('data-i18n', isCommunity ? 'home.heading.communityPre' : 'home.heading.pre');
  accent.setAttribute('data-i18n', isCommunity ? 'home.heading.communityAccent' : 'home.heading.accent');
  addBtn.setAttribute('data-i18n', isCommunity ? 'home.addOwnSongBtn' : 'home.addRequestBtn');
  pre.textContent = t(pre.getAttribute('data-i18n'));
  accent.textContent = t(accent.getAttribute('data-i18n'));
  addBtn.textContent = t(addBtn.getAttribute('data-i18n'));
}

// Публічні профілі — лише для залогінених (UsersController [Authorize]).
function openUserProfileOrLogin(userId){
  if(!currentUser?.authenticated){
    if(confirm(t('msg.confirmLoginGeneric'))) login();
    return;
  }
  openUserProfilePage(userId);
}

// ================================================================
// ОСОБИСТІ ПОВІДОМЛЕННЯ + ОБГОВОРЕННЯ (сторінка "Спілкування")
// ================================================================
let chatTab = 'threads';
let currentChatUserId = null;
let _chatPartnerName = '';
let currentThreadId = null;

function openChatPage(tab){
  if(tab) chatTab = tab;
  showPage('chat');
}
function loadChatPage(){ switchChatTab(chatTab); }
function switchChatTab(tab){
  const authed = !!currentUser?.authenticated;
  if(tab==='requests' && !authed) tab = 'dm'; // там же й підказка "увійдіть"
  chatTab = tab;
  ['dm','requests','threads'].forEach(k=>{
    document.getElementById(`chat-tab-${k}`).classList.toggle('active', tab===k);
    document.getElementById(`chat-${k}-section`).style.display = tab===k ? '' : 'none';
  });
  document.getElementById('chat-tab-requests').style.display = authed ? '' : 'none';
  if(tab==='dm'){
    document.getElementById('chat-dm-login-hint').style.display = authed ? 'none' : '';
    document.getElementById('chat-dm-layout').style.display = authed ? '' : 'none';
    if(!authed) return;
    loadConversations();
    if(currentChatUserId != null) loadDmThread();
  } else if(tab==='requests'){
    loadDmRequests();
  } else {
    if(currentThreadId != null) loadThreadDetail(); else closeThreadDetail();
  }
}
function openDirectChat(userId){
  if(!currentUser?.authenticated){
    if(confirm(t('msg.confirmLoginGeneric'))) login();
    return;
  }
  if(userId == null) return;
  if(currentChatUserId !== userId) _chatPartnerName = '';
  currentChatUserId = userId;
  openChatPage('dm');
}
function refreshDmBadge(){
  if(!currentUser?.authenticated) return;
  const setBadge = (id, n) => {
    const b = document.getElementById(id);
    if(!b) return;
    b.textContent = n > 99 ? '99+' : n;
    b.style.display = n > 0 ? '' : 'none';
  };
  fetch('/api/messages/unread-count').then(r=>r.ok?r.json():null).then(d=>{
    if(!d) return;
    setBadge('dm-badge', d.unread + d.requests);
    setBadge('chat-tab-dm-badge', d.unread);
    setBadge('chat-tab-requests-badge', d.requests);
  }).catch(()=>{});
}
// SignalR: новий/схвалений/відхилений запит на листування.
function onDmRequestsEvent(otherUserId){
  refreshDmBadge();
  if(!document.getElementById('page-chat')?.classList.contains('active')) return;
  if(chatTab==='requests') loadDmRequests();
  if(chatTab==='dm'){ loadConversations(); if(currentChatUserId === otherUserId) loadDmThread(); }
}
function loadDmRequests(){
  fetch('/api/messages/requests').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('chat-requests-empty').style.display = list.length ? 'none' : '';
    document.getElementById('chat-requests-list').innerHTML = list.map(r=>`
      <div class="dm-request-card">
        ${r.avatarUrl ? `<img src="${esc(r.avatarUrl)}" alt="">` : `<span class="chat-conv-ph"><svg class="icon"><use href="#icon-user"/></svg></span>`}
        <div class="dm-request-main">
          <div><a href="#" class="artist-link" onclick="openUserProfilePage(${r.userId});return false;"><strong>${esc(r.displayName)}</strong></a> <span class="hint">· ${esc(r.createdAt)}</span></div>
          <div class="dm-request-preview">${esc(r.preview)}</div>
        </div>
        <div class="dm-request-actions">
          <button class="btn btn-primary" onclick="respondDmRequest(${r.userId}, true)">${t('chat.acceptRequest')}</button>
          <button class="btn btn-outline" onclick="respondDmRequest(${r.userId}, false)">${t('chat.declineRequest')}</button>
        </div>
      </div>`).join('');
    refreshDmBadge();
  }).catch(()=>{});
}
function respondDmRequest(userId, accept){
  fetch(`/api/messages/requests/${userId}/${accept ? 'accept' : 'decline'}`, { method:'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      if(accept){ _chatPartnerName = ''; currentChatUserId = userId; switchChatTab('dm'); }
      else loadDmRequests();
      refreshDmBadge();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
// SignalR: нове повідомлення в будь-якому діалозі (моє з іншої вкладки або вхідне).
function onDirectMessageEvent(otherUserId){
  const chatOpen = document.getElementById('page-chat')?.classList.contains('active') && chatTab==='dm';
  if(chatOpen){
    loadConversations();
    if(currentChatUserId === otherUserId) loadDmThread(); // він і позначить прочитаним
    else refreshDmBadge();
  } else refreshDmBadge();
}
function loadConversations(){
  fetch('/api/messages/conversations').then(r=>r.ok?r.json():[]).then(list=>{
    const wrap = document.getElementById('chat-conversations');
    // Щойно відкрита з профілю розмова ще без повідомлень — показуємо її першою.
    const showPending = currentChatUserId != null && !list.some(c=>c.userId===currentChatUserId);
    document.getElementById('chat-conversations-empty').style.display = (list.length || showPending) ? 'none' : '';
    const item = c => `
      <div class="chat-conv${c.userId===currentChatUserId?' active':''}" onclick="selectConversation(${c.userId})">
        ${c.avatarUrl ? `<img src="${esc(c.avatarUrl)}" alt="">` : `<span class="chat-conv-ph"><svg class="icon"><use href="#icon-user"/></svg></span>`}
        <div class="chat-conv-main">
          <div class="chat-conv-top"><strong>${esc(c.displayName)}</strong>${c.unreadCount?`<span class="count-badge">${c.unreadCount}</span>`:''}</div>
          <div class="chat-conv-last">${c.state==='pending_outgoing'?`<span class="badge">${esc(t('chat.pendingLabel'))}</span> `:''}${c.lastFromMe?`${esc(t('chat.you'))}: `:''}${esc(c.lastMessage)}</div>
        </div>
      </div>`;
    wrap.innerHTML = (showPending ? item({userId:currentChatUserId, displayName:_chatPartnerName||'…', avatarUrl:null, lastMessage:t('chat.newConversation'), lastFromMe:false, unreadCount:0}) : '')
      + list.map(item).join('');
    const current = list.find(c=>c.userId===currentChatUserId);
    if(current){ _chatPartnerName = current.displayName; document.getElementById('chat-dm-partner').textContent = current.displayName; }
  }).catch(()=>{});
}
function selectConversation(userId){
  if(currentChatUserId !== userId) _chatPartnerName = '';
  currentChatUserId = userId;
  document.querySelectorAll('.chat-conv').forEach(el=>el.classList.remove('active'));
  loadDmThread();
  loadConversations();
}
function loadDmThread(){
  const id = currentChatUserId;
  if(id == null) return;
  document.getElementById('chat-dm-empty').style.display = 'none';
  document.getElementById('chat-dm-panel').style.display = '';
  const partner = document.getElementById('chat-dm-partner');
  partner.onclick = (e)=>{ e.preventDefault(); openUserProfilePage(id); };
  if(_chatPartnerName) partner.textContent = _chatPartnerName;
  else fetch(`/api/users/${id}`).then(r=>r.ok?r.json():null).then(u=>{
    if(u && currentChatUserId===id){ _chatPartnerName = u.displayName; partner.textContent = u.displayName; loadConversations(); }
  }).catch(()=>{});
  fetch(`/api/messages/${id}`).then(r=>r.ok?r.json():null).then(thread=>{
    if(!thread || currentChatUserId !== id) return;
    const list = thread.messages;
    // Не-другу: перше повідомлення — запит; далі чекаємо схвалення.
    const hint = document.getElementById('chat-dm-state-hint');
    const hintKey = { none: 'chat.state.none', pending_outgoing: 'chat.state.pendingOutgoing', declined: 'chat.state.declined', pending_incoming: 'chat.state.pendingIncoming' }[thread.state];
    hint.textContent = hintKey ? t(hintKey) : '';
    hint.style.display = hintKey ? '' : 'none';
    document.getElementById('chat-dm-input-row').style.display = thread.canSend ? '' : 'none';
    const box = document.getElementById('chat-dm-messages');
    box.innerHTML = list.length
      ? list.map(m=>`<div class="chat-msg${m.isMine?' mine':''}"><div class="chat-msg-body">${esc(m.body)}</div><div class="chat-msg-time">${esc(m.createdAt)}</div></div>`).join('')
      : `<div class="empty" style="padding:2rem 1rem;">${t('chat.startConversation')}</div>`;
    box.scrollTop = box.scrollHeight;
    refreshDmBadge();
  }).catch(()=>{});
}
function onChatInputKeydown(e){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendDirectMessage(); }
}
function sendDirectMessage(){
  const input = document.getElementById('chat-dm-input');
  const body = input.value.trim();
  if(!body || currentChatUserId == null) return;
  fetch(`/api/messages/${currentChatUserId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body }) })
    .then(r=>{
      if(r.status === 409 || r.status === 403){ loadDmThread(); return; } // запит ще не схвалено / відхилено — підказка вже пояснить
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      input.value = '';
      loadDmThread();
      loadConversations();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ─── Гілки обговорень ────────────────────────────────────────────────────
let threadsSearchTimer = null;
function onThreadsSearchInput(){
  clearTimeout(threadsSearchTimer);
  threadsSearchTimer = setTimeout(loadThreads, 300);
}
function _userLinkHtml(u){
  if(!u) return `<span style="color:var(--muted)">${esc(t('threads.deletedUser'))}</span>`;
  return `<a href="#" class="artist-link" onclick="event.stopPropagation();openUserProfileOrLogin(${u.userId});return false;">${esc(u.displayName)}</a>`;
}
function loadThreads(){
  const q = document.getElementById('threads-search').value.trim();
  document.getElementById('threads-new-btn').style.display = currentUser?.authenticated ? '' : 'none';
  fetch(`/api/threads${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('threads-empty').style.display = list.length ? 'none' : '';
    document.getElementById('threads-list').innerHTML = list.map(th=>`
      <div class="ext-search-item thread-card" onclick="openThread(${th.id})">
        <div class="es-main">
          <strong>${esc(th.title)}</strong>
          <span>${t('threads.by')} ${_userLinkHtml(th.author)} · ${esc(th.createdAt)}</span>
        </div>
        <div class="es-meta">
          <span class="es-year"><svg class="icon"><use href="#icon-chat"/></svg> ${th.postCount}</span>
          <span class="es-year">${t('threads.lastActivity')} ${esc(th.lastPostAt)}</span>
        </div>
      </div>`).join('');
  }).catch(()=>{});
}
function toggleNewThreadForm(){
  if(!currentUser?.authenticated){ if(confirm(t('msg.confirmLoginGeneric'))) login(); return; }
  const form = document.getElementById('thread-new-form');
  form.style.display = form.style.display === 'none' ? '' : 'none';
  if(form.style.display === '') document.getElementById('thread-new-title').focus();
}
function createThread(){
  const title = document.getElementById('thread-new-title').value.trim();
  const body = document.getElementById('thread-new-body').value.trim();
  if(!title || !body){ alert(t('msg.fillRequiredFields')); return; }
  fetch('/api/threads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, body }) })
    .then(r=>r.ok?r.json():null)
    .then(th=>{
      if(!th){ alert(t('msg.connectionError')); return; }
      document.getElementById('thread-new-title').value = '';
      document.getElementById('thread-new-body').value = '';
      document.getElementById('thread-new-form').style.display = 'none';
      openThread(th.id);
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function openThread(id){
  currentThreadId = id;
  chatTab = 'threads';
  if(!document.getElementById('page-chat').classList.contains('active')) showPage('chat');
  else loadThreadDetail();
}
function closeThreadDetail(){
  currentThreadId = null;
  document.getElementById('thread-detail-view').style.display = 'none';
  document.getElementById('threads-list-view').style.display = '';
  loadThreads();
}
function _canModerate(author){
  return !!currentUser?.isAdmin || (!!author && author.userId === currentUser?.userId);
}
function _deleteBtnHtml(onclick){
  return `<button class="btn-icon-danger" onclick="event.stopPropagation();${onclick}" title="${t('modal.confirmDelete')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg></button>`;
}
function loadThreadDetail(){
  const id = currentThreadId;
  if(id == null) return;
  document.getElementById('threads-list-view').style.display = 'none';
  document.getElementById('thread-detail-view').style.display = '';
  const authed = !!currentUser?.authenticated;
  document.getElementById('thread-reply-row').style.display = authed ? '' : 'none';
  document.getElementById('thread-reply-login-hint').style.display = authed ? 'none' : '';
  fetch(`/api/threads/${id}`).then(r=>r.ok?r.json():null).then(th=>{
    if(currentThreadId !== id) return;
    if(!th){ closeThreadDetail(); return; }
    document.getElementById('thread-detail-title').textContent = th.title;
    document.getElementById('thread-detail-meta').innerHTML = `${_userLinkHtml(th.author)} · ${esc(th.createdAt)}`;
    document.getElementById('thread-detail-body').textContent = th.body;
    document.getElementById('thread-detail-actions').innerHTML = _canModerate(th.author) ? _deleteBtnHtml(`deleteThread(${th.id})`) : '';
    document.getElementById('thread-posts').innerHTML = th.posts.map(p=>`
      <div class="thread-post">
        <div class="thread-post-head"><div class="thread-post-meta">${_userLinkHtml(p.author)} · ${esc(p.createdAt)}</div>${_canModerate(p.author) ? _deleteBtnHtml(`deleteThreadPost(${p.id})`) : ''}</div>
        <div class="thread-post-body">${esc(p.body)}</div>
      </div>`).join('');
  }).catch(()=>{});
}
function replyToThread(){
  const input = document.getElementById('thread-reply-input');
  const body = input.value.trim();
  if(!body || currentThreadId == null) return;
  fetch(`/api/threads/${currentThreadId}/posts`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body }) })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      input.value = '';
      loadThreadDetail();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deleteThread(id){
  if(!confirm(t('threads.confirmDeleteThread'))) return;
  fetch(`/api/threads/${id}`, { method:'DELETE' }).then(r=>{ if(r.ok) closeThreadDetail(); else alert(t('msg.connectionError')); }).catch(()=>{});
}
function deleteThreadPost(postId){
  if(!confirm(t('threads.confirmDeletePost'))) return;
  fetch(`/api/threads/posts/${postId}`, { method:'DELETE' }).then(r=>{ if(r.ok) loadThreadDetail(); else alert(t('msg.connectionError')); }).catch(()=>{});
}

// ================================================================
// ОЦІНКИ (0–100, тимчасово) І РЕЦЕНЗІЇ
// ================================================================
let ratingMusicId = null;
function openRatingModal(id){
  if(id == null) return;
  ratingMusicId = id;
  const s = _findSong(id);
  document.getElementById('rating-song-label').textContent = s ? `${s.artist} — ${s.title}` : '';
  document.getElementById('rating-summary').textContent = t('notif.loading');
  document.getElementById('rating-reviews').innerHTML = '';
  document.getElementById('rating-modal-overlay').classList.add('open');
  _loadRatingModal();
}
function closeRatingModal(){
  _closeModalAnimated('rating-modal-overlay');
  ratingMusicId = null;
}
document.getElementById('rating-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeRatingModal();
});
function _syncRatingNumber(el){
  let v = parseInt(el.value, 10);
  if(isNaN(v)) return;
  v = Math.max(0, Math.min(100, v));
  document.getElementById('rating-score').value = v;
}
function _setRatingInputs(score, review){
  document.getElementById('rating-score').value = score;
  document.getElementById('rating-score-num').value = score;
  document.getElementById('rating-review').value = review || '';
}
function _loadRatingModal(){
  const id = ratingMusicId;
  const authed = !!currentUser?.authenticated;
  document.getElementById('rating-form').style.display = authed ? '' : 'none';
  document.getElementById('rating-login-hint').style.display = authed ? 'none' : '';
  fetch(`/api/songs/${id}/ratings`).then(r=>r.ok?r.json():null).then(d=>{
    if(!d || ratingMusicId !== id) return;
    document.getElementById('rating-summary').textContent = d.avgRating != null
      ? t('rating.summary').replace('{avg}', d.avgRating).replace('{count}', d.ratingCount)
      : t('rating.noRatings');
    if(d.mine) _setRatingInputs(d.mine.score, d.mine.review);
    else _setRatingInputs(70, '');
    document.getElementById('rating-delete-btn').style.display = d.mine ? '' : 'none';
    document.getElementById('rating-reviews').innerHTML = d.reviews.length
      ? d.reviews.map(rv=>`
        <div class="rating-review">
          <div class="rating-review-head">
            ${_userLinkHtml(rv.user)}
            <span class="rating-chip has-rating"><svg class="icon"><use href="#icon-star"/></svg> ${rv.score}</span>
            <span class="rating-review-date">${esc(rv.updatedAt)}</span>
            ${currentUser?.isAdmin && rv.user.userId !== currentUser?.userId ? _deleteBtnHtml(`adminDeleteReview(${rv.user.userId})`) : ''}
          </div>
          <div class="rating-review-body">${esc(rv.review)}</div>
        </div>`).join('')
      : `<div class="hint">${t('rating.noReviews')}</div>`;
    _applyRatingSummary(id, d.avgRating, d.ratingCount);
  }).catch(()=>{});
}
function saveRating(){
  const id = ratingMusicId;
  const score = Math.max(0, Math.min(100, parseInt(document.getElementById('rating-score-num').value, 10) || 0));
  const review = document.getElementById('rating-review').value.trim();
  fetch(`/api/songs/${id}/ratings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ score, review: review || null }) })
    .then(r=>{
      if(r.status===401){ login(); return; }
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      _loadRatingModal();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deleteMyRating(){
  fetch(`/api/songs/${ratingMusicId}/ratings`, { method:'DELETE' })
    .then(r=>{ if(r.ok || r.status===404) _loadRatingModal(); })
    .catch(()=>{});
}
function adminDeleteReview(userId){
  if(!confirm(t('rating.confirmAdminDelete'))) return;
  fetch(`/api/songs/${ratingMusicId}/ratings?userId=${userId}`, { method:'DELETE' })
    .then(r=>{ if(r.ok) _loadRatingModal(); })
    .catch(()=>{});
}
// Нове середнє (з модалки чи SignalR ratingChanged) — точково в обох таблицях.
function _applyRatingSummary(musicId, avg, count){
  let changed = false;
  [songs, communitySongs, playerQueue, currentTopSongs].forEach(list=>list.forEach(s=>{
    if(s.id === musicId && (s.avgRating !== avg || s.ratingCount !== count)){ s.avgRating = avg; s.ratingCount = count; changed = true; }
  }));
  if(changed) renderSongs();
  if(ratingMusicId === musicId && document.getElementById('rating-modal-overlay').classList.contains('open')){
    const summary = document.getElementById('rating-summary');
    summary.textContent = avg != null ? t('rating.summary').replace('{avg}', avg).replace('{count}', count) : t('rating.noRatings');
  }
}

// ================================================================
// ГЛОБАЛЬНИЙ ПОШУК У НАВБАРІ: пісні (обидві таблиці), виконавці, люди
// ================================================================
let navSearchTimer = null;
let navSearchSeq = 0;
let navSearchSongs = [];
function _hideNavSearch(){
  document.getElementById('nav-search-results')?.classList.remove('open');
}
function onNavSearchInput(){
  clearTimeout(navSearchTimer);
  const q = document.getElementById('nav-search-input').value.trim();
  if(q.length < 2){ navSearchSeq++; _hideNavSearch(); return; }
  navSearchTimer = setTimeout(()=>runNavSearch(q), 220);
}
function onNavSearchKeydown(e){
  if(e.key === 'Escape'){ _hideNavSearch(); e.target.blur(); }
  if(e.key === 'Enter'){ document.querySelector('#nav-search-results .nav-search-item')?.click(); }
}
async function runNavSearch(q){
  const seq = ++navSearchSeq;
  const ql = q.toLowerCase();
  navSearchSongs = [...songs, ...communitySongs].filter(s=>
    s.title.toLowerCase().includes(ql) || s.artist.toLowerCase().includes(ql) || (s.album||'').toLowerCase().includes(ql)
  ).slice(0, 6);
  const [artists, users] = await Promise.all([
    fetch(`/api/artists?q=${encodeURIComponent(q)}`).then(r=>r.ok?r.json():[]).catch(()=>[]),
    currentUser?.authenticated ? fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=5`).then(r=>r.ok?r.json():[]).catch(()=>[]) : Promise.resolve([])
  ]);
  if(seq !== navSearchSeq) return; // встигли надрукувати далі — ці результати застарілі
  const section = (title, html) => html ? `<div class="nav-search-section">${title}</div>${html}` : '';
  const songsHtml = navSearchSongs.map(s=>`
    <button type="button" class="nav-search-item" onclick="navSearchPlay(${s.id})">
      <svg class="icon icon-filled"><use href="#icon-play"/></svg>
      <span class="nsi-main"><strong>${esc(s.title)}</strong><span>${esc(s.artist)}</span></span>
      ${s.source==='community'?`<span class="badge source-community">${t('home.source.community')}</span>`:''}
    </button>`).join('');
  const artistsHtml = artists.slice(0, 5).map(a=>`
    <button type="button" class="nav-search-item" onclick="_hideNavSearch();openArtistPage(${a.id})">
      <svg class="icon"><use href="#icon-mic"/></svg>
      <span class="nsi-main"><strong>${esc(a.name)}</strong><span>${a.songCount} ${t('profile.songsWord')}</span></span>
    </button>`).join('');
  const usersHtml = users.map(u=>`
    <button type="button" class="nav-search-item" onclick="_hideNavSearch();openUserProfilePage(${u.userId})">
      ${u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" alt="">` : `<svg class="icon"><use href="#icon-user"/></svg>`}
      <span class="nsi-main"><strong>${esc(u.displayName)}</strong></span>
    </button>`).join('');
  const html = section(t('navSearch.songs'), songsHtml) + section(t('navSearch.artists'), artistsHtml) + section(t('navSearch.users'), usersHtml);
  const box = document.getElementById('nav-search-results');
  box.innerHTML = html || `<div class="nav-search-empty">${t('navSearch.empty')}${currentUser?.authenticated ? '' : `<div class="hint">${t('navSearch.loginForUsers')}</div>`}</div>`;
  box.classList.add('open');
}
function navSearchPlay(id){
  _hideNavSearch();
  playerQueue = navSearchSongs.slice();
  playerIndex = Math.max(0, playerQueue.findIndex(s=>s.id===id));
  _loadCurrent();
}

// INIT
// Жорсткий запобіжник: якщо initApp() з якоїсь причини впаде/зависне,
// сплеш все одно ховається за 8с — інакше застряглий сплеш виглядав би
// як повністю непрацюючий сайт, що набагато гірше за втрачений момент polish.
setTimeout(_hideSplash, 8000);
initApp().catch(err => { console.error('initApp error:', err); _hideSplash(); });
applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
applyLang(currentLang);
document.getElementById('vol-slider').value = vol;
document.getElementById('vw1').style.display = vol===0?'none':'';
document.getElementById('vw2').style.display = vol<50?'none':'';
_updatePopoutBtnVisibility();

// ================================================================
// REALTIME (SignalR) — усі відкриті вкладки перезавантажують дані при мутації пісні/заявки.
// ================================================================
let rtConn = null;
if (window.signalR) {
  rtConn = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/music')
    .withAutomaticReconnect()
    .build();

  rtConn.on('songsChanged', () => {
    loadSongs().then(() => { renderSongs(); updateStats(); }).catch(() => {});
    // Немає окремої SignalR-події на сповіщення — бейдж оновлюємо тут же.
    if(currentUser?.authenticated) refreshNotifBadge();
  });
  rtConn.on('requestsChanged', () => {
    if (currentUser?.isAdmin){ renderRequests(); refreshAdminRequestsBadge(); }
  });
  // Нова заявка / дія іншого адміна — лише для групи адмінів (MusicHub.AdminsGroup).
  rtConn.on('adminNotification', () => {
    refreshNotifBadge();
    if(document.getElementById('notif-dropdown')?.classList.contains('open')) onOpenNotifDropdown();
  });
  rtConn.on('dmReceived', (fromUserId) => onDirectMessageEvent(fromUserId));
  rtConn.on('dmSent', (toUserId) => onDirectMessageEvent(toUserId));
  rtConn.on('dmRequestsChanged', (otherUserId) => onDmRequestsEvent(otherUserId));
  rtConn.on('threadsChanged', (threadId) => {
    if(!document.getElementById('page-chat')?.classList.contains('active') || chatTab !== 'threads') return;
    if(currentThreadId === threadId) loadThreadDetail();
    else if(currentThreadId == null) loadThreads();
  });
  rtConn.on('ratingChanged', (musicId, avg, count) => _applyRatingSummary(musicId, avg, count));

  rtConn.start().catch(() => {});
}
