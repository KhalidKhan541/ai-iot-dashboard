export type Locale = "en" | "es" | "fr" | "de" | "ja" | "zh" | "ar" | "pt";

export interface TranslationDict {
  [key: string]: string | TranslationDict;
}

export interface I18nConfig {
  defaultLocale: Locale;
  supportedLocales: Locale[];
  fallbackLocale: Locale;
  cookieName?: string;
  headerName?: string;
}

export interface I18nMessage {
  id: string;
  defaultMessage: string;
  description?: string;
}

const enTranslations: TranslationDict = {
  common: {
    loading: "Loading...",
    error: "An error occurred",
    success: "Success",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    export: "Export",
    import: "Import",
    refresh: "Refresh",
    back: "Back",
    next: "Next",
    previous: "Previous",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    ok: "OK",
    close: "Close",
    open: "Open",
    view: "View",
    details: "Details",
    settings: "Settings",
    help: "Help",
    about: "About",
    version: "Version",
    date: "Date",
    time: "Time",
    name: "Name",
    description: "Description",
    type: "Type",
    status: "Status",
    value: "Value",
    unit: "Unit",
    actions: "Actions",
    none: "None",
    all: "All",
    selected: "Selected",
    total: "Total",
    count: "Count",
  },
  navigation: {
    dashboard: "Dashboard",
    devices: "Devices",
    alerts: "Alerts",
    analytics: "Analytics",
    settings: "Settings",
    profile: "Profile",
    logout: "Logout",
    home: "Home",
    reports: "Reports",
    users: "Users",
    billing: "Billing",
    support: "Support",
  },
  device: {
    title: "Devices",
    addDevice: "Add Device",
    deviceName: "Device Name",
    deviceType: "Device Type",
    deviceStatus: "Device Status",
    online: "Online",
    offline: "Offline",
    error: "Error",
    lastSeen: "Last Seen",
    firmwareVersion: "Firmware Version",
    ipAddress: "IP Address",
    location: "Location",
    group: "Group",
    noDevices: "No devices found",
    confirmDelete: "Are you sure you want to delete this device?",
  },
  dashboard: {
    title: "Dashboard",
    addWidget: "Add Widget",
    editLayout: "Edit Layout",
    saveLayout: "Save Layout",
    resetLayout: "Reset Layout",
    widgetTypes: {
      lineChart: "Line Chart",
      barChart: "Bar Chart",
      pieChart: "Pie Chart",
      gauge: "Gauge",
      stat: "Statistics",
      table: "Table",
      map: "Map",
      timeline: "Timeline",
    },
  },
  alert: {
    title: "Alerts",
    createAlert: "Create Alert",
    alertName: "Alert Name",
    alertType: "Alert Type",
    severity: "Severity",
    severityLevels: {
      info: "Info",
      warning: "Warning",
      critical: "Critical",
    },
    condition: "Condition",
    threshold: "Threshold",
    acknowledge: "Acknowledge",
    snooze: "Snooze",
    noAlerts: "No alerts",
  },
  analytics: {
    title: "Analytics",
    overview: "Overview",
    devices: "Device Analytics",
    dataUsage: "Data Usage",
    performance: "Performance",
    predictions: "Predictions",
    anomalies: "Anomalies",
    exportReport: "Export Report",
  },
  settings: {
    title: "Settings",
    general: "General",
    appearance: "Appearance",
    notifications: "Notifications",
    security: "Security",
    integrations: "Integrations",
    apiKeys: "API Keys",
    theme: "Theme",
    language: "Language",
    timezone: "Timezone",
    dateFormat: "Date Format",
    darkMode: "Dark Mode",
  },
  auth: {
    login: "Login",
    register: "Register",
    forgotPassword: "Forgot Password",
    resetPassword: "Reset Password",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    rememberMe: "Remember Me",
    orContinueWith: "Or continue with",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
  },
  billing: {
    title: "Billing",
    currentPlan: "Current Plan",
    upgrade: "Upgrade",
    downgrade: "Downgrade",
    cancel: "Cancel Subscription",
    invoices: "Invoices",
    paymentMethod: "Payment Method",
    usage: "Usage",
    plans: {
      free: "Free",
      starter: "Starter",
      professional: "Professional",
      enterprise: "Enterprise",
    },
  },
  time: {
    now: "Just now",
    minutesAgo: "{count} minute ago",
    minutesAgo_plural: "{count} minutes ago",
    hoursAgo: "{count} hour ago",
    hoursAgo_plural: "{count} hours ago",
    daysAgo: "{count} day ago",
    daysAgo_plural: "{count} days ago",
    weeksAgo: "{count} week ago",
    weeksAgo_plural: "{count} weeks ago",
  },
  units: {
    bytes: "{value} B",
    kilobytes: "{value} KB",
    megabytes: "{value} MB",
    gigabytes: "{value} GB",
    terabytes: "{value} TB",
    celsius: "{value}°C",
    fahrenheit: "{value}°F",
    percent: "{value}%",
    rpm: "{value} RPM",
    volts: "{value} V",
    amps: "{value} A",
    watts: "{value} W",
  },
};

const esTranslations: TranslationDict = {
  common: {
    loading: "Cargando...",
    error: "Ocurrió un error",
    success: "Éxito",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Eliminar",
    edit: "Editar",
    create: "Crear",
    search: "Buscar",
    filter: "Filtrar",
    sort: "Ordenar",
    export: "Exportar",
    import: "Importar",
    refresh: "Actualizar",
    back: "Atrás",
    next: "Siguiente",
    previous: "Anterior",
    confirm: "Confirmar",
    yes: "Sí",
    no: "No",
    ok: "OK",
    close: "Cerrar",
    open: "Abrir",
    view: "Ver",
    details: "Detalles",
    settings: "Configuración",
    help: "Ayuda",
    about: "Acerca de",
    version: "Versión",
    date: "Fecha",
    time: "Hora",
    name: "Nombre",
    description: "Descripción",
    type: "Tipo",
    status: "Estado",
    value: "Valor",
    unit: "Unidad",
    actions: "Acciones",
    none: "Ninguno",
    all: "Todos",
    selected: "Seleccionado",
    total: "Total",
    count: "Recuento",
  },
  navigation: {
    dashboard: "Panel",
    devices: "Dispositivos",
    alerts: "Alertas",
    analytics: "Analíticas",
    settings: "Configuración",
    profile: "Perfil",
    logout: "Cerrar sesión",
    home: "Inicio",
    reports: "Informes",
    users: "Usuarios",
    billing: "Facturación",
    support: "Soporte",
  },
  device: {
    title: "Dispositivos",
    addDevice: "Agregar Dispositivo",
    deviceName: "Nombre del Dispositivo",
    deviceType: "Tipo de Dispositivo",
    deviceStatus: "Estado del Dispositivo",
    online: "En línea",
    offline: "Sin conexión",
    error: "Error",
    lastSeen: "Última Vista",
    firmwareVersion: "Versión del Firmware",
    ipAddress: "Dirección IP",
    location: "Ubicación",
    group: "Grupo",
    noDevices: "No se encontraron dispositivos",
    confirmDelete: "¿Estás seguro de que quieres eliminar este dispositivo?",
  },
  dashboard: {
    title: "Panel",
    addWidget: "Agregar Widget",
    editLayout: "Editar Diseño",
    saveLayout: "Guardar Diseño",
    resetLayout: "Restablecer Diseño",
    widgetTypes: {
      lineChart: "Gráfico de Líneas",
      barChart: "Gráfico de Barras",
      pieChart: "Gráfico Circular",
      gauge: "Medidor",
      stat: "Estadísticas",
      table: "Tabla",
      map: "Mapa",
      timeline: "Línea de Tiempo",
    },
  },
  alert: {
    title: "Alertas",
    createAlert: "Crear Alerta",
    alertName: "Nombre de la Alerta",
    alertType: "Tipo de Alerta",
    severity: "Severidad",
    severityLevels: {
      info: "Información",
      warning: "Advertencia",
      critical: "Crítica",
    },
    condition: "Condición",
    threshold: "Umbral",
    acknowledge: "Reconocer",
    snooze: "Posponer",
    noAlerts: "No hay alertas",
  },
};

const frTranslations: TranslationDict = {
  common: {
    loading: "Chargement...",
    error: "Une erreur s'est produite",
    success: "Succès",
    cancel: "Annuler",
    save: "Enregistrer",
    delete: "Supprimer",
    edit: "Modifier",
    create: "Créer",
    search: "Rechercher",
    filter: "Filtrer",
    sort: "Trier",
    export: "Exporter",
    import: "Importer",
    refresh: "Actualiser",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    confirm: "Confirmer",
    yes: "Oui",
    no: "Non",
    ok: "OK",
    close: "Fermer",
    open: "Ouvrir",
    view: "Voir",
    details: "Détails",
    settings: "Paramètres",
    help: "Aide",
    about: "À propos",
    version: "Version",
    date: "Date",
    time: "Heure",
    name: "Nom",
    description: "Description",
    type: "Type",
    status: "Statut",
    value: "Valeur",
    unit: "Unité",
    actions: "Actions",
    none: "Aucun",
    all: "Tous",
    selected: "Sélectionné",
    total: "Total",
    count: "Nombre",
  },
};

const translations: Record<Locale, TranslationDict> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  de: {} as TranslationDict,
  ja: {} as TranslationDict,
  zh: {} as TranslationDict,
  ar: {} as TranslationDict,
  pt: {} as TranslationDict,
};

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in values ? String(values[key]) : `{${key}}`;
  });
}

export class I18n {
  private locale: Locale;
  private config: I18nConfig;
  private listeners = new Set<(locale: Locale) => void>();

  constructor(config: Partial<I18nConfig> = {}) {
    this.config = {
      defaultLocale: "en",
      supportedLocales: ["en", "es", "fr", "de", "ja", "zh"],
      fallbackLocale: "en",
      cookieName: "locale",
      headerName: "Accept-Language",
      ...config,
    };

    this.locale = this.config.defaultLocale;
  }

  getLocale(): Locale {
    return this.locale;
  }

  setLocale(locale: Locale): void {
    if (this.config.supportedLocales.includes(locale)) {
      this.locale = locale;
      for (const listener of this.listeners) {
        listener(locale);
      }
    }
  }

  t(key: string, values?: Record<string, string | number>): string {
    const localeData = translations[this.locale] ?? translations[this.config.fallbackLocale];
    const fallbackData = translations[this.config.fallbackLocale];

    let message = getNestedValue(localeData, key);
    if (!message) {
      message = getNestedValue(fallbackData, key);
    }
    if (!message) {
      return key;
    }

    if (values) {
      return interpolate(message, values);
    }

    return message;
  }

  has(key: string): boolean {
    const localeData = translations[this.locale] ?? translations[this.config.fallbackLocale];
    return getNestedValue(localeData, key) !== undefined;
  }

  getLocaleData(locale?: Locale): TranslationDict {
    return translations[locale ?? this.locale] ?? {};
  }

  getSupportedLocales(): Locale[] {
    return [...this.config.supportedLocales];
  }

  onLocaleChange(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return new Intl.DateTimeFormat(this.locale, options).format(d);
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(value);
  }

  formatCurrency(value: number, currency: string = "USD"): string {
    return new Intl.NumberFormat(this.locale, {
      style: "currency",
      currency,
    }).format(value);
  }

  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" }).format(value, unit);
  }

  getDirection(): "ltr" | "rtl" {
    return this.locale === "ar" ? "rtl" : "ltr";
  }

  getLanguageTag(): string {
    const tags: Record<Locale, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      ja: "ja-JP",
      zh: "zh-CN",
      ar: "ar-SA",
      pt: "pt-BR",
    };
    return tags[this.locale] ?? "en-US";
  }
}

export function createI18n(config?: Partial<I18nConfig>): I18n {
  return new I18n(config);
}

export const i18n = createI18n();
