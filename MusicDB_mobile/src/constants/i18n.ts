// Перенесено 1:1 з I18N веб-версії (wwwroot/index.html) + мобільні ключі (позначені // NEW).
export const I18N = {
  uk: {
    'nav.home': 'Головна',
    'nav.request': 'Надіслати запит',
    'nav.admin': 'Адмін — Запити',
    'nav.add': 'Додати пісню',
    'nav.recommendations': 'Рекомендовано для вас',
    'nav.profile': 'Профіль',
    'nav.library': 'Бібліотека', // NEW
    'nav.admin.tab': 'Адмін', // NEW
    'nav.top': 'Топ 100', // NEW
    'top.heading.pre': 'Топ 100', // NEW
    'top.heading.accent': 'найпрослуханіших', // NEW
    'top.empty': 'Ще немає прослуховувань', // NEW

    'theme.toggle': 'Змінити тему',
    'stat.songs': 'Композицій',
    'stat.genres': 'Жанрів',
    'stat.albums': 'Альбомів',
    'stat.singles': 'Сінглів',
    'home.heading.pre': 'Опубліковані',
    'home.heading.accent': 'пісні',
    'home.addRequestBtn': '+ Надіслати запит',
    'search.placeholder': 'Пошук за назвою, виконавцем або альбомом…',
    'filter.allGenres': 'Усі жанри',
    'table.shuffle': '🔀 Перемішати',
    'table.number': '№',
    'table.artist': 'Виконавець',
    'table.title': 'Назва',
    'table.release': 'Дата релізу',
    'table.duration': 'Тривалість',
    'table.genres': 'Жанри',
    'table.album': 'Альбом',
    'table.action': 'Дія',
    'table.empty': 'Нічого не знайдено',
    'table.single': 'Сінгл',
    'request.heading.pre': 'Запит на',
    'request.heading.accent': 'додавання пісні',
    'request.successAlert': '✓ Запит успішно надіслано! Очікуйте підтвердження адміністратора.',
    'request.submitBtn': 'Надіслати запит',
    'extsearch.title': 'Схожі пісні (натисніть, щоб заповнити форму)',
    'extsearch.analyzingGenres': 'Аналізуємо жанри…',
    'form.artist': 'Виконавець *',
    'form.artist.placeholder': "Ім'я артиста",
    'form.title': 'Назва пісні *',
    'form.title.placeholder': 'Назва композиції',
    'form.release': 'Дата релізу *',
    'form.duration': 'Тривалість *',
    'form.duration.hint': 'Формат: РРРР-ММ-ДД. Тривалість: гг:хх:сс',
    'form.album': "Альбом (необов'язково)",
    'form.album.placeholder': 'Назва альбому або залиште порожнім для сінглу',
    'form.genres': 'Жанри *',
    'form.genres.placeholder': 'Рок, Поп, Джаз',
    'form.genres.hint': 'Через кому',
    'form.youtubeVideoId': "Відео YouTube (необов'язково)",
    'form.youtubeVideoId.placeholder': 'ID або посилання на відео, або залиште порожнім',
    'form.youtubeVideoId.hint': 'Очистіть поле, щоб скинути кеш — застосунок сам знайде відео заново',
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
    'admin.normalizeGenresBtn': "🧹 Об'єднати дублікати жанрів",
    'admin.normalizeGenresRunning': 'Перевірка триває…',
    'admin.normalizeGenresNone': 'Дублікатів не знайдено — усі жанри унікальні.',
    'admin.normalizeGenresError': 'Не вдалося звернутись до ШІ (перевірте ключ Gemini):',
    'admin.normalizeGenresDone': "Об'єднано груп: {count}",
    'msg.errorNormalizeGenres': "Помилка при об'єднанні жанрів",
    'msg.errorEditSong': 'Помилка при збереженні пісні',
    'add.heading.pre': 'Додати',
    'add.heading.accent': 'нову композицію',
    'add.successAlert': '✓ Композицію успішно додано до бази даних!',
    'add.submitBtn': 'Додати до бази',
    'page.title': "N'Owl",
    'player.shuffle': 'Перемішати',
    'player.prev': 'Попередня',
    'player.next': 'Наступна',
    'player.repeat': 'Повтор',
    'player.video': 'Відкрити відео',
    'player.close': 'Закрити',
    'videoPopup.title': '▶ Відео',
    'videoPopup.loading': 'Завантаження…',
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
    'profile.heading.pre': 'Мій',
    'profile.heading.accent': 'профіль',
    'profile.displayName': 'Нікнейм',
    'profile.avatar': 'Зображення профілю',
    'profile.avatarHint': 'Оберіть зображення з пристрою',
    'profile.avatarRemove': 'прибрати й повернути фото з Google',
    'profile.displayName.placeholder': 'Наприклад, MusicLover228',
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
    'profile.backToProfile': '← До профілю',
    'profile.playlistEmpty': 'У цьому плейлисті ще немає пісень',
    'profile.playBtn': 'Відтворити',
    'profile.playAllBtn': '▶ Слухати весь плейлист',
    'profile.favToggle': 'Улюблене',
    'profile.songsWord': 'пісень',
    'profile.newPlaylistPrompt': 'Назва нового плейлиста:',
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

    // NEW — специфічно для мобільного застосунку
    'settings.theme': 'Тема',
    'theme.dark': 'Темна',
    'theme.light': 'Світла',
    'theme.gray': 'Сіра',
    'settings.language': 'Мова',
    'lang.uk': 'Українська',
    'lang.en': 'English',
    'settings.title': 'Налаштування',
    'settings.apiBase': 'Адреса сервера MusicDB',
    'settings.apiBase.placeholder': 'https://your-server.example.com',
    'settings.apiBase.hint': 'Адреса, на якій запущено MusicDB.Api (той самий бекенд, що й для веб-версії).',
    'settings.save': 'Зберегти й продовжити',
    'settings.invalid': 'Введіть коректну адресу (напр. https://example.com)',
    'settings.change': 'Налаштування',
    'nav.settings': 'Сервер',
    'login.title': 'Вхід через Google',
    'login.cancel': 'Скасувати',
    'auth.loginRequiredTitle': 'Потрібен вхід',
    'auth.loginRequiredGeneric': 'Щоб продовжити, увійдіть через Google.',
    'common.loading': 'Завантаження…',
    'common.retry': 'Спробувати ще раз',
    'common.cancel': 'Скасувати',
    'date.placeholder': 'дд.мм.рррр',
    'date.clear': 'Очистити',
    'date.today': 'Сьогодні',
    'common.save': 'Зберегти',
    'common.create': 'Створити',
    'common.delete': 'Видалити',
    'common.close': 'Закрити',
    'common.error': 'Помилка',
    'common.ok': 'Гаразд',
    'player.nowPlaying': 'Зараз грає',
    'player.videoNotFound': 'Відео не знайдено',
    'player.openInVideo': 'Показати відео',
    'error.loadFailed': "Не вдалося завантажити дані. Перевірте з'єднання.",
    'sort.button': 'Сортувати',
    'sort.default': 'За замовчуванням',
    'sort.plays': 'Прослуховувань',

    // Ком'юніті: таблиця_2, оцінки, листування, обговорення, пошук
    'nav.community': 'Спільнота', // NEW
    'home.source.catalog': 'Каталог', // NEW
    'home.source.community': 'Ком\'юніті', // NEW
    'home.heading.communityPre': 'Пісні від', // NEW
    'home.heading.communityAccent': 'ком\'юніті', // NEW
    'home.communityHint': 'Власні пісні учасників спільноти — завантажені файлом або з посиланням на YouTube.', // NEW
    'home.addOwnSongBtn': '+ Додати свою пісню', // NEW
    'table.communityEmpty': 'Тут ще немає пісень від ком\'юніті — додайте свою першою', // NEW
    'table.rating': 'Оцінка', // NEW
    'table.submittedBy': 'Додав', // NEW
    'request.kind.catalog': 'До каталогу', // NEW
    'request.kind.community': 'Власна пісня', // NEW
    'form.audioFile': 'Файл пісні', // NEW
    'form.audioPick': 'Обрати файл…', // NEW
    'form.audioFile.hint': 'MP3, M4A, OGG, WAV, FLAC — до 25 МБ. Необов\'язково, якщо вказано YouTube-відео.', // NEW
    'form.youtube': 'Посилання на YouTube-відео', // NEW
    'form.youtube.placeholder': 'ID або посилання на відео', // NEW
    'msg.audioTooLarge': 'Файл більший за 25 МБ.', // NEW
    'msg.communityNeedsFileOrVideo': 'Додайте файл пісні або посилання на YouTube-відео.', // NEW
    'admin.hasAudioFile': 'є файл пісні', // NEW
    'adminNotif.tab': 'Сповіщення', // NEW
    'adminNotif.someone': 'Хтось', // NEW
    'adminNotif.request_submitted': 'надсилає запит', // NEW
    'adminNotif.request_approved': 'схвалює запит', // NEW
    'adminNotif.request_rejected': 'відхиляє запит', // NEW
    'adminNotif.song_added': 'додав', // NEW
    'notif.markAllRead': 'Позначити все прочитаним', // NEW
    'notif.empty': 'Немає нових сповіщень', // NEW
    'rating.title': 'Оцінка пісні', // NEW
    'rating.summary': 'Середня оцінка: {avg} / 100 · оцінок: {count}', // NEW
    'rating.noRatings': 'Ще ніхто не оцінив', // NEW
    'rating.yourScore': 'Ваша оцінка (0–100)', // NEW
    'rating.review': 'Рецензія (необов\'язково)', // NEW
    'rating.reviewPlaceholder': 'Що зачепило, що ні…', // NEW
    'rating.deleteBtn': 'Прибрати оцінку', // NEW
    'rating.loginHint': 'Увійдіть, щоб оцінити пісню й написати рецензію', // NEW
    'rating.reviewsTitle': 'Рецензії', // NEW
    'rating.noReviews': 'Рецензій ще немає', // NEW
    'chat.heading.pre': 'Спілкування', // NEW
    'chat.heading.accent': 'ком\'юніті', // NEW
    'chat.tab.dm': 'Особисті', // NEW
    'chat.tab.requests': 'Запити', // NEW
    'chat.tab.threads': 'Обговорення', // NEW
    'chat.loginHint': 'Увійдіть, щоб листуватися', // NEW
    'chat.newHintMobile': 'Нова розмова — через пошук людей (іконка лупи вгорі).', // NEW
    'chat.noConversations': 'Ще немає розмов', // NEW
    'chat.pendingLabel': 'запит надіслано', // NEW
    'chat.you': 'Ви', // NEW
    'chat.requestsHint': 'Друзі пишуть вам напряму. Інші люди можуть надіслати одне повідомлення — листування відкриється, лише якщо ви схвалите запит.', // NEW
    'chat.requestsEmpty': 'Немає нових запитів на листування', // NEW
    'chat.acceptRequest': 'Схвалити', // NEW
    'chat.declineRequest': 'Відхилити', // NEW
    'chat.startConversation': 'Напишіть перше повідомлення', // NEW
    'chat.inputPlaceholderMobile': 'Повідомлення…', // NEW
    'chat.sendBtn': 'Надіслати', // NEW
    'chat.writeBtn': 'Написати', // NEW
    'chat.state.none': 'Ви ще не друзі — перше повідомлення надійде як запит на листування. Далі писати можна буде після схвалення.', // NEW
    'chat.state.pendingOutgoing': 'Запит на листування надіслано. Писати далі можна буде, щойно співрозмовник його схвалить.', // NEW
    'chat.state.declined': 'Співрозмовник відхилив запит на листування.', // NEW
    'chat.state.pendingIncoming': 'Це запит на листування. Відповідь автоматично його схвалить.', // NEW
    'threads.searchPlaceholder': 'Пошук гілки…', // NEW
    'threads.newBtn': '+ Нова гілка', // NEW
    'threads.titleLabel': 'Тема', // NEW
    'threads.bodyLabel': 'Повідомлення', // NEW
    'threads.createBtn': 'Створити гілку', // NEW
    'threads.empty': 'Ще немає обговорень — почніть перше', // NEW
    'threads.by': 'від', // NEW
    'threads.deletedUser': 'видалений користувач', // NEW
    'threads.confirmDeleteThread': 'Видалити цю гілку разом з усіма відповідями?', // NEW
    'threads.confirmDeletePost': 'Видалити цю відповідь?', // NEW
    'threads.replyPlaceholder': 'Ваша відповідь…', // NEW
    'threads.replyBtn': 'Відповісти', // NEW
    'modal.deleteTitleGeneric': 'Видалити?', // NEW
    'navSearch.placeholder': 'Пісні, виконавці, люди…', // NEW
    'navSearch.songs': 'Пісні', // NEW
    'navSearch.artists': 'Виконавці', // NEW
    'navSearch.users': 'Люди', // NEW
    'navSearch.empty': 'Нічого не знайдено', // NEW
    'navSearch.loginForUsers': 'Увійдіть, щоб шукати людей', // NEW
    'chat.clearBtn': 'Видалити чат', // NEW
    'chat.clearConfirm': "Видалити цей чат у себе? У співрозмовника переписка лишиться, а нові повідомлення з'являться тут знову.", // NEW
    'nav.explore': 'Огляд', // NEW
    'explore.heading.pre': 'Що', // NEW
    'explore.heading.accent': 'послухати', // NEW
    'nav.wheel': 'Колесо фортуни', // NEW
    'nav.battle': 'Батл рояль', // NEW
    'nav.artists': 'Виконавці', // NEW
    'nav.friends': 'Друзі', // NEW
    'explore.wheelSub': 'Випадковий жанр — готовий плейлист', // NEW
    'explore.battleSub': 'Турнір пісень з плейлиста', // NEW
    'explore.artistsSub': 'Каталог, дискографії, підписки', // NEW
    'wheel.spinBtn': 'Крутити', // NEW
    'wheel.playBtn': 'Слухати', // NEW
    'wheel.resultLabel': 'Випав жанр:', // NEW
    'wheel.legendTitle': 'Жанри на колесі', // NEW
    'wheel.countLabel': 'Жанрів на колесі', // NEW
    'wheel.modeRandom': 'Випадкові',
    'wheel.modeCustom': 'Мій вибір',
    'wheel.pickGenresBtn': 'Обрати жанри',
    'wheel.pickTitle': 'Жанри для колеса',
    'wheel.searchPlaceholder': 'Пошук жанру…',
    'wheel.selectedCount': 'Обрано: {n}',
    'wheel.customEmpty': 'Оберіть щонайменше 2 жанри',
    'wheel.clearBtn': 'Очистити',
    'wheel.doneBtn': 'Готово',
    'wheel.nothingFound': 'Нічого не знайдено',
    'wheel.durationLabel': 'Тривалість прокрутки, сек', // NEW
    'wheel.playlistEmpty': 'Крутніть колесо, щоб сформувати плейлист із випадкового жанру', // NEW
    'wheel.notEnough': 'Замало жанрів — потрібно хоча б 2 жанри з 5+ піснями', // NEW
    'battle.heading.pre': 'Батл', // NEW
    'battle.heading.accent': 'рояль', // NEW
    'battle.pageOwnHeading': 'Мої плейлисти', // NEW
    'battle.pageOwnLoginHint': 'Увійдіть, щоб побачити тут свої плейлисти', // NEW
    'battle.pageOwnEmpty': 'У вас ще немає плейлистів — створіть їх у профілі', // NEW
    'battle.pagePublicHeading': 'Плейлисти спільноти', // NEW
    'battle.pagePublicEmpty': 'Ще немає публічних плейлистів — зробіть свій публічним у профілі', // NEW
    'battle.publicBadge': 'публічний', // NEW
    'battle.privateBadge': 'приватний', // NEW
    'battle.chooseSize': 'Оберіть розмір турніру:', // NEW
    'battle.notEnough': 'Замало пісень у плейлисті — потрібно щонайменше 16.', // NEW
    'battle.roundLabel': 'Учасників: ', // NEW
    'battle.vs': 'VS', // NEW
    'battle.chooseBtn': 'Обрати цю', // NEW
    'battle.listenBtn': 'Послухати', // NEW
    'battle.championLabel': 'Переможець', // NEW
    'battle.listenToWinnerBtn': 'Слухати переможця', // NEW
    'battle.exitConfirm': 'Вийти з турніру? Прогрес буде втрачено.', // NEW
    'battle.exit': 'Вийти', // NEW
    'battle.genreHeading': 'Батл за жанром',
    'battle.genreHint': 'Випадкові пісні одного жанру — жанри, де пісень щонайменше 16',
    'battle.genreStart': 'Почати',
    'battle.genreEmpty': 'Поки що немає жанру з 16+ піснями',
    'battle.mobileHint': 'Послухайте обидві пісні й оберіть кращу. Переможці виходять у наступне коло.', // NEW
    'artists.heading.pre': 'Всі', // NEW
    'artists.heading.accent': 'виконавці', // NEW
    'artists.searchPlaceholder': 'Пошук виконавця…', // NEW
    'artists.empty': 'Нічого не знайдено', // NEW
    'artist.followBtn': '+ Підписатись', // NEW
    'artist.unfollowBtn': 'Підписано', // NEW
    'artist.followers': 'підписників', // NEW
    'artist.discography': 'Дискографія', // NEW
    'artist.notFound': 'Виконавця не знайдено', // NEW
    'friends.searchPlaceholder': 'Пошук людей за іменем…', // NEW
    'friends.searchEmpty': 'Нікого не знайдено', // NEW
    'friends.incoming': 'Вхідні запити', // NEW
    'friends.incomingRequestLabel': 'хоче додати вас у друзі', // NEW
    'friends.outgoing': 'Надіслані запити', // NEW
    'friends.myFriends': 'Мої друзі', // NEW
    'friends.friendsEmpty': 'Ще немає друзів — знайдіть когось через пошук вище', // NEW
    'friends.addBtn': '+ Додати в друзі', // NEW
    'friends.pendingLabel': 'Запит надіслано', // NEW
    'friends.cancelBtn': 'Скасувати', // NEW
    'friends.acceptBtn': 'Прийняти', // NEW
    'friends.rejectBtn': 'Відхилити', // NEW
    'friends.unfriendBtn': 'Розфрендити', // NEW
    'friends.friendsBadge': 'Друзі', // NEW
    'friends.unfriendConfirm': 'Видалити {name} з друзів?', // NEW
    'profile.public.notFound': 'Користувача не знайдено', // NEW
    'profile.public.memberSince': 'На сайті з', // NEW
    'profile.public.playlistsTitle': 'Публічні плейлисти', // NEW
    'profile.public.playlistsEmpty': 'Немає публічних плейлистів', // NEW
    'profile.public.writeBtn': 'Написати', // NEW
    'profile.publicToggleHint': 'Натисніть на мітку, щоб зробити плейлист публічним чи приватним — публічні бачать інші в «Батл рояль» і у вашому профілі', // NEW
    'bugs.menu': 'Повідомити про баг', // NEW
    'bugs.title': 'Повідомити про баг', // NEW
    'bugs.describe': 'Що сталося? *', // NEW
    'bugs.placeholder': 'Що ви робили, що очікували побачити і що сталося натомість…', // NEW
    'bugs.attachContext': 'Додати технічні дані (пісня, пристрій, версія)', // NEW
    'bugs.send': 'Надіслати', // NEW
    'bugs.tooShort': 'Опишіть, будь ласка, трохи докладніше (від 10 символів).', // NEW
    'bugs.tooMany': 'Забагато звітів за годину — спробуйте пізніше.', // NEW
    'bugs.thanks': 'Дякуємо! Звіт надіслано адміністраторам.', // NEW
    'bugs.filter.open': 'Відкриті', // NEW
    'bugs.filter.resolved': 'Вирішені', // NEW
    'bugs.filter.all': 'Усі', // NEW
    'bugs.empty': 'Немає баг-репортів', // NEW
    'bugs.status.open': 'відкритий', // NEW
    'bugs.status.resolved': 'вирішений', // NEW
    'bugs.resolveBtn': 'Позначити вирішеним', // NEW
    'bugs.reopenBtn': 'Відкрити знову', // NEW
    'bugs.contextTitle': 'Технічні дані', // NEW
    'bugs.resolvedBy': 'Вирішив', // NEW
    'adminHub.bugsTab': 'Баги', // NEW
    'adminNotif.bug_reported': 'повідомляє про баг', // NEW
    'theme.system': 'Системна', // NEW
    'settings.accent': 'Акцентний колір', // NEW
    'settings.accent.hint': 'Кнопки, посилання, цифри статистики. Контраст підлаштовується під тему автоматично.', // NEW
    'settings.accent.amber': 'Бурштин', // NEW
    'settings.accent.coral': 'Корал', // NEW
    'settings.accent.rose': 'Троянда', // NEW
    'settings.accent.lavender': 'Лаванда', // NEW
    'settings.accent.ocean': 'Океан', // NEW
    'settings.accent.emerald': 'Смарагд', // NEW
    'settings.done': 'Готово', // NEW
    'settings.sub': 'Зберігаються на цьому пристрої й діють одразу.', // NEW
    'bugs.attachContextHint': 'Допомагає відтворити помилку: адмін бачить, що саме було відкрито. Без паролів чи особистих даних.', // NEW
    'bugs.previewSummary': 'Що саме буде надіслано?', // NEW
    'admin.lyrics': 'Текст пісні (необов\'язково)', // NEW
    'admin.lyrics.placeholder': 'Вставте текст пісні рядок за рядком, або залиште порожнім', // NEW
    'player.karaoke': 'Текст', // NEW
    'player.karaokeEmpty': 'Для цієї пісні ще немає тексту', // NEW
    'bugs.addScreenshot': 'Додати скріншот', // NEW
    'bugs.screenshotsHint': 'До 3 зображень, до 5 МБ кожне.', // NEW
    'bugs.shotTooBig': 'Зображення більше 5 МБ.', // NEW
    'bugs.shotsTitle': 'Скріншоти', // NEW
    'battle.undo': 'Крок назад', // NEW
    'battle.videoHint': 'Натисніть «Послухати» — тут з’явиться відео', // NEW
    'battle.audioOnly': 'Трек без відео — грає аудіофайл', // NEW
    'bugs.deleteBtn': 'Видалити', // NEW
    'bugs.deleteConfirm': 'Видалити цей баг-репорт разом зі скріншотами? Це не можна скасувати.', // NEW
    'update.ready': 'Доступна нова версія застосунку', // NEW
    'update.restart': 'Перезапустити', // NEW
  },
  en: {
    'nav.home': 'Home',
    'nav.request': 'Submit request',
    'nav.admin': 'Admin — Requests',
    'nav.add': 'Add song',
    'nav.recommendations': 'Recommended for you',
    'nav.profile': 'Profile',
    'nav.library': 'Library',
    'nav.admin.tab': 'Admin',
    'nav.top': 'Top 100', // NEW
    'top.heading.pre': 'Top 100', // NEW
    'top.heading.accent': 'most played', // NEW
    'top.empty': 'No listens yet', // NEW

    'theme.toggle': 'Switch theme',
    'stat.songs': 'Songs',
    'stat.genres': 'Genres',
    'stat.albums': 'Albums',
    'stat.singles': 'Singles',
    'home.heading.pre': 'Published',
    'home.heading.accent': 'songs',
    'home.addRequestBtn': '+ Submit request',
    'search.placeholder': 'Search by title, artist, or album…',
    'filter.allGenres': 'All genres',
    'table.shuffle': '🔀 Shuffle',
    'table.number': '#',
    'table.artist': 'Artist',
    'table.title': 'Title',
    'table.release': 'Release date',
    'table.duration': 'Duration',
    'table.genres': 'Genres',
    'table.album': 'Album',
    'table.action': 'Action',
    'table.empty': 'Nothing found',
    'table.single': 'Single',
    'request.heading.pre': 'Request to',
    'request.heading.accent': 'add a song',
    'request.successAlert': '✓ Request sent successfully! Wait for admin approval.',
    'request.submitBtn': 'Submit request',
    'extsearch.title': 'Similar songs (tap to fill the form)',
    'extsearch.analyzingGenres': 'Analyzing genres…',
    'form.artist': 'Artist *',
    'form.artist.placeholder': 'Artist name',
    'form.title': 'Song title *',
    'form.title.placeholder': 'Song title',
    'form.release': 'Release date *',
    'form.duration': 'Duration *',
    'form.duration.hint': 'Format: YYYY-MM-DD. Duration: hh:mm:ss',
    'form.album': 'Album (optional)',
    'form.album.placeholder': 'Album name, or leave empty for a single',
    'form.genres': 'Genres *',
    'form.genres.placeholder': 'Rock, Pop, Jazz',
    'form.genres.hint': 'Comma-separated',
    'form.youtubeVideoId': 'YouTube video (optional)',
    'form.youtubeVideoId.placeholder': 'Video ID or link, or leave empty',
    'form.youtubeVideoId.hint': 'Clear this to reset the cache — the app will search again',
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
    'admin.normalizeGenresBtn': '🧹 Merge duplicate genres',
    'admin.normalizeGenresRunning': 'Checking…',
    'admin.normalizeGenresNone': 'No duplicates found — all genres are unique.',
    'admin.normalizeGenresError': 'Could not reach the AI (check your Gemini key):',
    'admin.normalizeGenresDone': 'Groups merged: {count}',
    'msg.errorNormalizeGenres': 'Error merging genres',
    'msg.errorEditSong': 'Error saving song',
    'add.heading.pre': 'Add a',
    'add.heading.accent': 'new song',
    'add.successAlert': '✓ Song successfully added to the database!',
    'add.submitBtn': 'Add to database',
    'page.title': "N'Owl",
    'player.shuffle': 'Shuffle',
    'player.prev': 'Previous',
    'player.next': 'Next',
    'player.repeat': 'Repeat',
    'player.video': 'Open video',
    'player.close': 'Close',
    'videoPopup.title': '▶ Video',
    'videoPopup.loading': 'Loading…',
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
    'profile.backToProfile': '← Back to profile',
    'profile.playlistEmpty': 'This playlist has no songs yet',
    'profile.playBtn': 'Play',
    'profile.playAllBtn': '▶ Play playlist',
    'profile.favToggle': 'Favorite',
    'profile.songsWord': 'songs',
    'profile.newPlaylistPrompt': 'New playlist name:',
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

    'settings.theme': 'Theme',
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'theme.gray': 'Gray',
    'settings.language': 'Language',
    'lang.uk': 'Українська',
    'lang.en': 'English',
    'settings.title': 'Settings',
    'settings.apiBase': 'MusicDB server address',
    'settings.apiBase.placeholder': 'https://your-server.example.com',
    'settings.apiBase.hint': 'The address MusicDB.Api runs on (the same backend as the web version).',
    'settings.save': 'Save & continue',
    'settings.invalid': 'Enter a valid address (e.g. https://example.com)',
    'settings.change': 'Settings',
    'nav.settings': 'Server',
    'login.title': 'Sign in with Google',
    'login.cancel': 'Cancel',
    'auth.loginRequiredTitle': 'Sign-in required',
    'auth.loginRequiredGeneric': 'Please sign in with Google to continue.',
    'common.loading': 'Loading…',
    'common.retry': 'Try again',
    'common.cancel': 'Cancel',
    'date.placeholder': 'dd.mm.yyyy',
    'date.clear': 'Clear',
    'date.today': 'Today',
    'common.save': 'Save',
    'common.create': 'Create',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.error': 'Error',
    'common.ok': 'OK',
    'player.nowPlaying': 'Now playing',
    'player.videoNotFound': 'Video not found',
    'player.openInVideo': 'Show video',
    'error.loadFailed': 'Failed to load data. Check your connection.',
    'sort.button': 'Sort',
    'sort.default': 'Default',
    'sort.plays': 'Plays',

    // Ком'юніті: таблиця_2, оцінки, листування, обговорення, пошук
    'nav.community': 'Community', // NEW
    'home.source.catalog': 'Catalog', // NEW
    'home.source.community': 'Community', // NEW
    'home.heading.communityPre': 'Songs from the', // NEW
    'home.heading.communityAccent': 'community', // NEW
    'home.communityHint': 'Original songs by community members — uploaded as a file or linked from YouTube.', // NEW
    'home.addOwnSongBtn': '+ Add your song', // NEW
    'table.communityEmpty': 'No community songs yet — be the first to add yours', // NEW
    'table.rating': 'Rating', // NEW
    'table.submittedBy': 'Added by', // NEW
    'request.kind.catalog': 'For the catalog', // NEW
    'request.kind.community': 'My own song', // NEW
    'form.audioFile': 'Song file', // NEW
    'form.audioPick': 'Choose a file…', // NEW
    'form.audioFile.hint': 'MP3, M4A, OGG, WAV, FLAC — up to 25 MB. Optional if a YouTube video is given.', // NEW
    'form.youtube': 'YouTube video link', // NEW
    'form.youtube.placeholder': 'Video ID or link', // NEW
    'msg.audioTooLarge': 'The file is larger than 25 MB.', // NEW
    'msg.communityNeedsFileOrVideo': 'Add a song file or a YouTube video link.', // NEW
    'admin.hasAudioFile': 'has a song file', // NEW
    'adminNotif.tab': 'Notifications', // NEW
    'adminNotif.someone': 'Someone', // NEW
    'adminNotif.request_submitted': 'submitted a request', // NEW
    'adminNotif.request_approved': 'approved a request', // NEW
    'adminNotif.request_rejected': 'rejected a request', // NEW
    'adminNotif.song_added': 'added', // NEW
    'notif.markAllRead': 'Mark all as read', // NEW
    'notif.empty': 'No new notifications', // NEW
    'rating.title': 'Rate the song', // NEW
    'rating.summary': 'Average score: {avg} / 100 · ratings: {count}', // NEW
    'rating.noRatings': 'No ratings yet', // NEW
    'rating.yourScore': 'Your score (0–100)', // NEW
    'rating.review': 'Review (optional)', // NEW
    'rating.reviewPlaceholder': 'What worked, what didn’t…', // NEW
    'rating.deleteBtn': 'Remove rating', // NEW
    'rating.loginHint': 'Sign in to rate the song and write a review', // NEW
    'rating.reviewsTitle': 'Reviews', // NEW
    'rating.noReviews': 'No reviews yet', // NEW
    'chat.heading.pre': 'Community', // NEW
    'chat.heading.accent': 'chat', // NEW
    'chat.tab.dm': 'Messages', // NEW
    'chat.tab.requests': 'Requests', // NEW
    'chat.tab.threads': 'Discussions', // NEW
    'chat.loginHint': 'Sign in to send messages', // NEW
    'chat.newHintMobile': 'Start a new conversation via people search (the magnifier icon at the top).', // NEW
    'chat.noConversations': 'No conversations yet', // NEW
    'chat.pendingLabel': 'request sent', // NEW
    'chat.you': 'You', // NEW
    'chat.requestsHint': 'Friends message you directly. Other people can send one message — the conversation opens only if you accept the request.', // NEW
    'chat.requestsEmpty': 'No new message requests', // NEW
    'chat.acceptRequest': 'Accept', // NEW
    'chat.declineRequest': 'Decline', // NEW
    'chat.startConversation': 'Write the first message', // NEW
    'chat.inputPlaceholderMobile': 'Message…', // NEW
    'chat.sendBtn': 'Send', // NEW
    'chat.writeBtn': 'Message', // NEW
    'chat.state.none': 'You are not friends yet — your first message will arrive as a message request. You can keep writing once it is accepted.', // NEW
    'chat.state.pendingOutgoing': 'Message request sent. You can write more once it is accepted.', // NEW
    'chat.state.declined': 'This person declined your message request.', // NEW
    'chat.state.pendingIncoming': 'This is a message request. Replying accepts it automatically.', // NEW
    'threads.searchPlaceholder': 'Search threads…', // NEW
    'threads.newBtn': '+ New thread', // NEW
    'threads.titleLabel': 'Topic', // NEW
    'threads.bodyLabel': 'Message', // NEW
    'threads.createBtn': 'Create thread', // NEW
    'threads.empty': 'No discussions yet — start the first one', // NEW
    'threads.by': 'by', // NEW
    'threads.deletedUser': 'deleted user', // NEW
    'threads.confirmDeleteThread': 'Delete this thread with all replies?', // NEW
    'threads.confirmDeletePost': 'Delete this reply?', // NEW
    'threads.replyPlaceholder': 'Your reply…', // NEW
    'threads.replyBtn': 'Reply', // NEW
    'modal.deleteTitleGeneric': 'Delete?', // NEW
    'navSearch.placeholder': 'Songs, artists, people…', // NEW
    'navSearch.songs': 'Songs', // NEW
    'navSearch.artists': 'Artists', // NEW
    'navSearch.users': 'People', // NEW
    'navSearch.empty': 'Nothing found', // NEW
    'navSearch.loginForUsers': 'Sign in to search for people', // NEW
    'chat.clearBtn': 'Delete chat', // NEW
    'chat.clearConfirm': 'Delete this chat for yourself? The other person keeps the conversation, and new messages will show up here again.', // NEW
    'nav.explore': 'Explore', // NEW
    'explore.heading.pre': 'What to', // NEW
    'explore.heading.accent': 'listen to', // NEW
    'nav.wheel': 'Wheel of fortune', // NEW
    'nav.battle': 'Battle royale', // NEW
    'nav.artists': 'Artists', // NEW
    'nav.friends': 'Friends', // NEW
    'explore.wheelSub': 'A random genre — a ready playlist', // NEW
    'explore.battleSub': 'A song tournament from a playlist', // NEW
    'explore.artistsSub': 'Catalog, discographies, follows', // NEW
    'wheel.spinBtn': 'Spin', // NEW
    'wheel.playBtn': 'Play', // NEW
    'wheel.resultLabel': 'You got:', // NEW
    'wheel.legendTitle': 'Genres on the wheel', // NEW
    'wheel.countLabel': 'Genres on the wheel', // NEW
    'wheel.modeRandom': 'Random',
    'wheel.modeCustom': 'My pick',
    'wheel.pickGenresBtn': 'Pick genres',
    'wheel.pickTitle': 'Genres for the wheel',
    'wheel.searchPlaceholder': 'Search genres…',
    'wheel.selectedCount': 'Selected: {n}',
    'wheel.customEmpty': 'Pick at least 2 genres',
    'wheel.clearBtn': 'Clear',
    'wheel.doneBtn': 'Done',
    'wheel.nothingFound': 'Nothing found',
    'wheel.durationLabel': 'Spin duration, sec', // NEW
    'wheel.playlistEmpty': 'Spin the wheel to build a playlist from a random genre', // NEW
    'wheel.notEnough': 'Not enough genres — need at least 2 genres with 5+ songs', // NEW
    'battle.heading.pre': 'Battle', // NEW
    'battle.heading.accent': 'royale', // NEW
    'battle.pageOwnHeading': 'My playlists', // NEW
    'battle.pageOwnLoginHint': 'Log in to see your own playlists here', // NEW
    'battle.pageOwnEmpty': 'You don\'t have any playlists yet — create one in your profile', // NEW
    'battle.pagePublicHeading': 'Community playlists', // NEW
    'battle.pagePublicEmpty': 'No public playlists yet — make one of yours public in your profile', // NEW
    'battle.publicBadge': 'public', // NEW
    'battle.privateBadge': 'private', // NEW
    'battle.chooseSize': 'Choose tournament size:', // NEW
    'battle.notEnough': 'Not enough songs in this playlist — need at least 16.', // NEW
    'battle.roundLabel': 'Contestants: ', // NEW
    'battle.vs': 'VS', // NEW
    'battle.chooseBtn': 'Pick this one', // NEW
    'battle.listenBtn': 'Listen', // NEW
    'battle.championLabel': 'Champion', // NEW
    'battle.listenToWinnerBtn': 'Listen to the champion', // NEW
    'battle.exitConfirm': 'Leave the tournament? Progress will be lost.', // NEW
    'battle.exit': 'Leave', // NEW
    'battle.genreHeading': 'Genre battle',
    'battle.genreHint': 'Random songs of one genre — genres with at least 16 songs',
    'battle.genreStart': 'Start',
    'battle.genreEmpty': 'No genre has 16+ songs yet',
    'battle.mobileHint': 'Listen to both songs and pick the better one. Winners go to the next round.', // NEW
    'artists.heading.pre': 'All', // NEW
    'artists.heading.accent': 'artists', // NEW
    'artists.searchPlaceholder': 'Search for an artist…', // NEW
    'artists.empty': 'Nothing found', // NEW
    'artist.followBtn': '+ Follow', // NEW
    'artist.unfollowBtn': 'Following', // NEW
    'artist.followers': 'followers', // NEW
    'artist.discography': 'Discography', // NEW
    'artist.notFound': 'Artist not found', // NEW
    'friends.searchPlaceholder': 'Search people by name…', // NEW
    'friends.searchEmpty': 'No one found', // NEW
    'friends.incoming': 'Incoming requests', // NEW
    'friends.incomingRequestLabel': 'wants to add you as a friend', // NEW
    'friends.outgoing': 'Sent requests', // NEW
    'friends.myFriends': 'My friends', // NEW
    'friends.friendsEmpty': 'No friends yet — find someone using the search above', // NEW
    'friends.addBtn': '+ Add friend', // NEW
    'friends.pendingLabel': 'Request sent', // NEW
    'friends.cancelBtn': 'Cancel', // NEW
    'friends.acceptBtn': 'Accept', // NEW
    'friends.rejectBtn': 'Reject', // NEW
    'friends.unfriendBtn': 'Unfriend', // NEW
    'friends.friendsBadge': 'Friends', // NEW
    'friends.unfriendConfirm': 'Remove {name} from friends?', // NEW
    'profile.public.notFound': 'User not found', // NEW
    'profile.public.memberSince': 'Member since', // NEW
    'profile.public.playlistsTitle': 'Public playlists', // NEW
    'profile.public.playlistsEmpty': 'No public playlists', // NEW
    'profile.public.writeBtn': 'Message', // NEW
    'profile.publicToggleHint': 'Tap the label to make a playlist public or private — public ones are visible to others in "Battle royale" and on your profile', // NEW
    'bugs.menu': 'Report a bug', // NEW
    'bugs.title': 'Report a bug', // NEW
    'bugs.describe': 'What happened? *', // NEW
    'bugs.placeholder': 'What you were doing, what you expected and what happened instead…', // NEW
    'bugs.attachContext': 'Attach technical details (song, device, version)', // NEW
    'bugs.send': 'Send', // NEW
    'bugs.tooShort': 'Please describe it in a bit more detail (10+ characters).', // NEW
    'bugs.tooMany': 'Too many reports this hour — please try again later.', // NEW
    'bugs.thanks': 'Thank you! The report was sent to the admins.', // NEW
    'bugs.filter.open': 'Open', // NEW
    'bugs.filter.resolved': 'Resolved', // NEW
    'bugs.filter.all': 'All', // NEW
    'bugs.empty': 'No bug reports', // NEW
    'bugs.status.open': 'open', // NEW
    'bugs.status.resolved': 'resolved', // NEW
    'bugs.resolveBtn': 'Mark resolved', // NEW
    'bugs.reopenBtn': 'Reopen', // NEW
    'bugs.contextTitle': 'Technical details', // NEW
    'bugs.resolvedBy': 'Resolved by', // NEW
    'adminHub.bugsTab': 'Bugs', // NEW
    'adminNotif.bug_reported': 'reported a bug', // NEW
    'theme.system': 'System', // NEW
    'settings.accent': 'Accent color', // NEW
    'settings.accent.hint': 'Buttons, links, stat numbers. Contrast adapts to the theme automatically.', // NEW
    'settings.accent.amber': 'Amber', // NEW
    'settings.accent.coral': 'Coral', // NEW
    'settings.accent.rose': 'Rose', // NEW
    'settings.accent.lavender': 'Lavender', // NEW
    'settings.accent.ocean': 'Ocean', // NEW
    'settings.accent.emerald': 'Emerald', // NEW
    'settings.done': 'Done', // NEW
    'settings.sub': 'Saved on this device and applied instantly.', // NEW
    'bugs.attachContextHint': 'Helps reproduce the problem: the admin sees what exactly was open. No passwords or personal data.', // NEW
    'bugs.previewSummary': 'What exactly will be sent?', // NEW
    'admin.lyrics': 'Song lyrics (optional)', // NEW
    'admin.lyrics.placeholder': 'Paste the lyrics line by line, or leave empty', // NEW
    'player.karaoke': 'Lyrics', // NEW
    'player.karaokeEmpty': 'No lyrics for this song yet', // NEW
    'bugs.addScreenshot': 'Add screenshot', // NEW
    'bugs.screenshotsHint': 'Up to 3 images, 5 MB each.', // NEW
    'bugs.shotTooBig': 'The image is larger than 5 MB.', // NEW
    'bugs.shotsTitle': 'Screenshots', // NEW
    'battle.undo': 'Step back', // NEW
    'battle.videoHint': 'Tap "Listen" — the video will show up here', // NEW
    'battle.audioOnly': 'No video for this track — playing the audio file', // NEW
    'bugs.deleteBtn': 'Delete', // NEW
    'bugs.deleteConfirm': 'Delete this bug report along with its screenshots? This cannot be undone.', // NEW
    'update.ready': 'A new version of the app is ready', // NEW
    'update.restart': 'Restart', // NEW
  },
} as const;

export type Lang = keyof typeof I18N;
export type I18nKey = keyof typeof I18N['uk'];
