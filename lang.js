// ...existing code...
const translations = {
  pl: {
    title: "Nina PLUs PAint",
    new: "Nowe",
    open: "Otwórz",
    save: "Zapisz PNG",
    undo: "↶ Cofnij",
    redo: "↷ Ponów",
    clear: "Wyczyść",
    tool_brush: "Pędzel",
    tool_eraser: "Gumka",
    tool_line: "Linia",
    tool_rect: "Prostokąt",
    tool_circle: "Okrąg",
    tool_fill: "Wypełnij",
    tool_text: "Tekst",
    tool_pipette: "Pipeta",
    tool_spray: "Spray",
    tool_rainbow: "Tęcza",
    tool_randomShape: "Losowy Kształt",
    tool_shuffle: "Glitch",
    // modloader
    modloader_title: "Catalog for Mods v1",
    modloader_url_label: "URL do moda (.js)",
    modloader_load_url: "Załaduj z URL",
    modloader_choose_file_label: "Lub wybierz plik .js z dysku",
    modloader_choose_file_btn: "Wybierz plik (Explorer)",
    modloader_status_loaded: "Mod załadowany: ",
    modloader_status_error: "Błąd ładowania moda: ",
    modloader_loaded_mods: "Załadowane mody",
    modloader_remove_btn: "Usuń",
    modloader_no_file_selected: "Nie wybrano pliku",
    modloader_invalid_url: "Podaj poprawny URL do pliku .js"
  },
  en: {
    title: "Nina PLUs PAint",
    new: "New",
    open: "Open",
    save: "Save PNG",
    undo: "Undo ↶",
    redo: "Redo ↷",
    clear: "Clear",
    tool_brush: "Brush",
    tool_eraser: "Eraser",
    tool_line: "Line",
    tool_rect: "Rectangle",
    tool_circle: "Circle",
    tool_fill: "Fill",
    tool_text: "Text",
    tool_pipette: "Eyedropper",
    tool_spray: "Spray",
    tool_rainbow: "Rainbow",
    tool_randomShape: "Random Shape",
    tool_shuffle: "Glitch",
    // modloader
    modloader_title: "Catalog for Mods v1",
    modloader_url_label: "Mod URL (.js)",
    modloader_load_url: "Load from URL",
    modloader_choose_file_label: "Or choose a .js file from disk",
    modloader_choose_file_btn: "Choose file (Explorer)",
    modloader_status_loaded: "Mod loaded: ",
    modloader_status_error: "Error loading mod: ",
    modloader_loaded_mods: "Loaded mods",
    modloader_remove_btn: "Remove",
    modloader_no_file_selected: "No file selected",
    modloader_invalid_url: "Provide a valid .js file URL"
  },
  ar: {
    title: "نينا بلس بينت",
    new: "جديد",
    open: "فتح",
    save: "حفظ PNG",
    undo: "↶ تراجع",
    redo: "↷ إعادة",
    clear: "مسح",
    tool_brush: "فرشاة",
    tool_eraser: "ممحاة",
    tool_line: "خط",
    tool_rect: "مستطيل",
    tool_circle: "دائرة",
    tool_fill: "تعبئة",
    tool_text: "نص",
    tool_pipette: "قطارة",
    tool_spray: "رش",
    tool_rainbow: "قوس قزح",
    tool_randomShape: "شكل عشوائي",
    tool_shuffle: "خلل",
    // modloader
    modloader_title: "كتالوج الإضافات v1",
    modloader_url_label: "رابط الإضافة (.js)",
    modloader_load_url: "تحميل من الرابط",
    modloader_choose_file_label: "أو اختر ملف .js من القرص",
    modloader_choose_file_btn: "اختر ملف (المستعرض)",
    modloader_status_loaded: "تم تحميل الإضافة: ",
    modloader_status_error: "خطأ في تحميل الإضافة: ",
    modloader_loaded_mods: "الإضافات المحملة",
    modloader_remove_btn: "إزالة",
    modloader_no_file_selected: "لم يتم اختيار ملف",
    modloader_invalid_url: "أدخل رابط ملف .js صالح"
  },
  ja: {
    title: "Nina PLUs PAint",
    new: "新規",
    open: "開く",
    save: "PNG保存",
    undo: "↶ 元に戻す",
    redo: "↷ やり直す",
    clear: "クリア",
    tool_brush: "ブラシ",
    tool_eraser: "消しゴム",
    tool_line: "線",
    tool_rect: "四角形",
    tool_circle: "円",
    tool_fill: "塗りつぶし",
    tool_text: "テキスト",
    tool_pipette: "スポイト",
    tool_spray: "スプレー",
    tool_rainbow: "虹",
    tool_randomShape: "ランダム形",
    tool_shuffle: "グリッチ",
    // modloader
    modloader_title: "Mod カタログ v1",
    modloader_url_label: "Mod の URL (.js)",
    modloader_load_url: "URL から読み込む",
    modloader_choose_file_label: "またはディスクから .js ファイルを選択",
    modloader_choose_file_btn: "ファイルを選択 (エクスプローラー)",
    modloader_status_loaded: "モッドを読み込みました: ",
    modloader_status_error: "モッドの読み込みエラー: ",
    modloader_loaded_mods: "読み込まれたモッド",
    modloader_remove_btn: "削除",
    modloader_no_file_selected: "ファイルが選択されていません",
    modloader_invalid_url: ".js ファイルの有効な URL を入力してください"
  }
};
// Funkcja zmiany języka
function setLanguage(lang){
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if(translations[lang] && translations[lang][key]){
      el.textContent = translations[lang][key];
    }
  });

  // dodatkowe pola modloadera (jeśli chcesz przy dynamicznej zmianie tekstów)
  if(translations[lang]) {
    const t = translations[lang];
    const titleEl = document.querySelector('.mods-panel h3');
    if(titleEl && t.modloader_title) titleEl.textContent = t.modloader_title;
    const urlLabel = document.querySelector('.modloader label');
    if(urlLabel && t.modloader_url_label) urlLabel.textContent = t.modloader_url_label;
    const loadBtn = document.getElementById('load-mod-btn');
    if(loadBtn && t.modloader_load_url) loadBtn.textContent = t.modloader_load_url;
    const chooseLabel = document.querySelector('.modloader > div label');
    if(chooseLabel && t.modloader_choose_file_label) chooseLabel.textContent = t.modloader_choose_file_label;
    const chooseBtn = document.getElementById('load-mod-file-btn');
    if(chooseBtn && t.modloader_choose_file_btn) chooseBtn.textContent = t.modloader_choose_file_btn;
    const loadedHeader = document.querySelector('.modloader h4');
    if(loadedHeader && t.modloader_loaded_mods) loadedHeader.textContent = t.modloader_loaded_mods;
  }
}
// ...existing code...