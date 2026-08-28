/**
 * ATS-Quant 2.0 - Internationalization Engine (i18n.js)
 * Production-ready I18N module with support for zh, en, fr, ru, es, ar
 * Compatible with plain script tag inclusion (non-ES module)
 *
 * @version 3.0.0
 * @author ATS-Quant Team
 */

(function(global) {
    'use strict';

    // ===================================================================
    // Configuration
    // ===================================================================
    var STORAGE_KEY = 'ats_language';
    var DEFAULT_LANGUAGE = 'en';
    var RTL_LANGUAGES = ['ar'];

    var SUPPORTED_LANGUAGES = {
        zh: { name: 'Chinese',       native: '中文',      dir: 'ltr' },
        en: { name: 'English',       native: 'English',   dir: 'ltr' },
        fr: { name: 'French',        native: 'Français',  dir: 'ltr' },
        ru: { name: 'Russian',       native: 'Русский',   dir: 'ltr' },
        es: { name: 'Spanish',       native: 'Español',   dir: 'ltr' },
        ar: { name: 'Arabic',        native: 'العربية',   dir: 'rtl' }
    };

    // ===================================================================
    // Translation Dictionary
    // ===================================================================
    var TRANSLATIONS = {
        // -----------------------------------------------------------------
        // Common / Shared
        // -----------------------------------------------------------------
        common: {
            app_name: {
                zh: 'ATS-Quant',
                en: 'ATS-Quant',
                fr: 'ATS-Quant',
                ru: 'ATS-Quant',
                es: 'ATS-Quant',
                ar: 'ATS-Quant'
            },
            loading: {
                zh: '加载中...',
                en: 'Loading...',
                fr: 'Chargement...',
                ru: 'Загрузка...',
                es: 'Cargando...',
                ar: 'جاري التحميل...'
            },
            save: {
                zh: '保存',
                en: 'Save',
                fr: 'Enregistrer',
                ru: 'Сохранить',
                es: 'Guardar',
                ar: 'حفظ'
            },
            cancel: {
                zh: '取消',
                en: 'Cancel',
                fr: 'Annuler',
                ru: 'Отмена',
                es: 'Cancelar',
                ar: 'إلغاء'
            },
            confirm: {
                zh: '确认',
                en: 'Confirm',
                fr: 'Confirmer',
                ru: 'Подтвердить',
                es: 'Confirmar',
                ar: 'تأكيد'
            },
            delete: {
                zh: '删除',
                en: 'Delete',
                fr: 'Supprimer',
                ru: 'Удалить',
                es: 'Eliminar',
                ar: 'حذف'
            },
            edit: {
                zh: '编辑',
                en: 'Edit',
                fr: 'Modifier',
                ru: 'Редактировать',
                es: 'Editar',
                ar: 'تعديل'
            },
            close: {
                zh: '关闭',
                en: 'Close',
                fr: 'Fermer',
                ru: 'Закрыть',
                es: 'Cerrar',
                ar: 'إغلاق'
            },
            search: {
                zh: '搜索',
                en: 'Search',
                fr: 'Rechercher',
                ru: 'Поиск',
                es: 'Buscar',
                ar: 'بحث'
            },
            submit: {
                zh: '提交',
                en: 'Submit',
                fr: 'Soumettre',
                ru: 'Отправить',
                es: 'Enviar',
                ar: 'إرسال'
            },
            yes: {
                zh: '是',
                en: 'Yes',
                fr: 'Oui',
                ru: 'Да',
                es: 'Sí',
                ar: 'نعم'
            },
            no: {
                zh: '否',
                en: 'No',
                fr: 'Non',
                ru: 'Нет',
                es: 'No',
                ar: 'لا'
            },
            error: {
                zh: '错误',
                en: 'Error',
                fr: 'Erreur',
                ru: 'Ошибка',
                es: 'Error',
                ar: 'خطأ'
            },
            success: {
                zh: '成功',
                en: 'Success',
                fr: 'Succès',
                ru: 'Успех',
                es: 'Éxito',
                ar: 'نجاح'
            },
            warning: {
                zh: '警告',
                en: 'Warning',
                fr: 'Avertissement',
                ru: 'Предупреждение',
                es: 'Advertencia',
                ar: 'تحذير'
            },
            info: {
                zh: '信息',
                en: 'Info',
                fr: 'Info',
                ru: 'Информация',
                es: 'Información',
                ar: 'معلومات'
            },
            logout: {
                zh: '退出登录',
                en: 'Logout',
                fr: 'Déconnexion',
                ru: 'Выйти',
                es: 'Cerrar sesión',
                ar: 'تسجيل الخروج'
            },
            settings: {
                zh: '设置',
                en: 'Settings',
                fr: 'Paramètres',
                ru: 'Настройки',
                es: 'Configuración',
                ar: 'الإعدادات'
            },
            language: {
                zh: '语言',
                en: 'Language',
                fr: 'Langue',
                ru: 'Язык',
                es: 'Idioma',
                ar: 'اللغة'
            },
            theme: {
                zh: '主题',
                en: 'Theme',
                fr: 'Thème',
                ru: 'Тема',
                es: 'Tema',
                ar: 'السمة'
            },
            dark_mode: {
                zh: '深色模式',
                en: 'Dark Mode',
                fr: 'Mode sombre',
                ru: 'Тёмный режим',
                es: 'Modo oscuro',
                ar: 'الوضع الداكن'
            },
            light_mode: {
                zh: '浅色模式',
                en: 'Light Mode',
                fr: 'Mode clair',
                ru: 'Светлый режим',
                es: 'Modo claro',
                ar: 'الوضع الفاتح'
            }
        },

        // -----------------------------------------------------------------
        // Navigation
        // -----------------------------------------------------------------
        nav: {
            dashboard: {
                zh: '仪表盘',
                en: 'Dashboard',
                fr: 'Tableau de bord',
                ru: 'Панель управления',
                es: 'Panel de control',
                ar: 'لوحة التحكم'
            },
            strategies: {
                zh: '策略',
                en: 'Strategies',
                fr: 'Stratégies',
                ru: 'Стратегии',
                es: 'Estrategias',
                ar: 'الاستراتيجيات'
            },
            backtest: {
                zh: '回测',
                en: 'Backtest',
                fr: 'Backtest',
                ru: 'Бэктест',
                es: 'Backtest',
                ar: 'الاختبار التاريخي'
            },
            live_trading: {
                zh: '实盘交易',
                en: 'Live Trading',
                fr: 'Trading en direct',
                ru: 'Живая торговля',
                es: 'Trading en vivo',
                ar: 'التداول المباشر'
            },
            portfolio: {
                zh: '投资组合',
                en: 'Portfolio',
                fr: 'Portefeuille',
                ru: 'Портфель',
                es: 'Cartera',
                ar: 'المحفظة'
            },
            analytics: {
                zh: '分析',
                en: 'Analytics',
                fr: 'Analytique',
                ru: 'Аналитика',
                es: 'Analítica',
                ar: 'التحليلات'
            },
            signals: {
                zh: '信号',
                en: 'Signals',
                fr: 'Signaux',
                ru: 'Сигналы',
                es: 'Señales',
                ar: 'الإشارات'
            },
            data_center: {
                zh: '数据中心',
                en: 'Data Center',
                fr: 'Centre de données',
                ru: 'Центр данных',
                es: 'Centro de datos',
                ar: 'مركز البيانات'
            },
            reports: {
                zh: '报告',
                en: 'Reports',
                fr: 'Rapports',
                ru: 'Отчёты',
                es: 'Informes',
                ar: 'التقارير'
            },
            help: {
                zh: '帮助',
                en: 'Help',
                fr: 'Aide',
                ru: 'Помощь',
                es: 'Ayuda',
                ar: 'المساعدة'
            }
        },

        // -----------------------------------------------------------------
        // Dashboard
        // -----------------------------------------------------------------
        dashboard: {
            title: {
                zh: '仪表盘',
                en: 'Dashboard',
                fr: 'Tableau de bord',
                ru: 'Панель управления',
                es: 'Panel de control',
                ar: 'لوحة التحكم'
            },
            total_pnl: {
                zh: '总盈亏',
                en: 'Total P&L',
                fr: 'P&P Total',
                ru: 'Общий P&L',
                es: 'P&L Total',
                ar: 'إجمالي الربح والخسارة'
            },
            win_rate: {
                zh: '胜率',
                en: 'Win Rate',
                fr: 'Taux de réussite',
                ru: 'Процент побед',
                es: 'Tasa de acierto',
                ar: 'معدل الفوز'
            },
            active_strategies: {
                zh: '活跃策略',
                en: 'Active Strategies',
                fr: 'Stratégies actives',
                ru: 'Активные стратегии',
                es: 'Estrategias activas',
                ar: 'الاستراتيجيات النشطة'
            },
            today_trades: {
                zh: '今日交易',
                en: 'Today\'s Trades',
                fr: 'Trades du jour',
                ru: 'Сделки сегодня',
                es: 'Operaciones de hoy',
                ar: 'صفقات اليوم'
            },
            recent_activity: {
                zh: '最近活动',
                en: 'Recent Activity',
                fr: 'Activité récente',
                ru: 'Недавняя активность',
                es: 'Actividad reciente',
                ar: 'النشاط الأخير'
            },
            market_overview: {
                zh: '市场概览',
                en: 'Market Overview',
                fr: 'Aperçu du marché',
                ru: 'Обзор рынка',
                es: 'Resumen del mercado',
                ar: 'نظرة عامة على السوق'
            },
            no_data: {
                zh: '暂无数据',
                en: 'No data available',
                fr: 'Aucune donnée disponible',
                ru: 'Нет данных',
                es: 'No hay datos disponibles',
                ar: 'لا توجد بيانات متاحة'
            }
        },

        // -----------------------------------------------------------------
        // Strategies
        // -----------------------------------------------------------------
        strategies: {
            title: {
                zh: '策略管理',
                en: 'Strategy Management',
                fr: 'Gestion des stratégies',
                ru: 'Управление стратегиями',
                es: 'Gestión de estrategias',
                ar: 'إدارة الاستراتيجيات'
            },
            new_strategy: {
                zh: '新建策略',
                en: 'New Strategy',
                fr: 'Nouvelle stratégie',
                ru: 'Новая стратегия',
                es: 'Nueva estrategia',
                ar: 'استراتيجية جديدة'
            },
            strategy_name: {
                zh: '策略名称',
                en: 'Strategy Name',
                fr: 'Nom de la stratégie',
                ru: 'Название стратегии',
                es: 'Nombre de la estrategia',
                ar: 'اسم الاستراتيجية'
            },
            strategy_type: {
                zh: '策略类型',
                en: 'Strategy Type',
                fr: 'Type de stratégie',
                ru: 'Тип стратегии',
                es: 'Tipo de estrategia',
                ar: 'نوع الاستراتيجية'
            },
            status: {
                zh: '状态',
                en: 'Status',
                fr: 'Statut',
                ru: 'Статус',
                es: 'Estado',
                ar: 'الحالة'
            },
            active: {
                zh: '活跃',
                en: 'Active',
                fr: 'Active',
                ru: 'Активна',
                es: 'Activa',
                ar: 'نشط'
            },
            inactive: {
                zh: '停用',
                en: 'Inactive',
                fr: 'Inactive',
                ru: 'Неактивна',
                es: 'Inactiva',
                ar: 'غير نشط'
            },
            run_backtest: {
                zh: '运行回测',
                en: 'Run Backtest',
                fr: 'Lancer le backtest',
                ru: 'Запустить бэктест',
                es: 'Ejecutar backtest',
                ar: 'تشغيل الاختبار التاريخي'
            },
            deploy_live: {
                zh: '部署实盘',
                en: 'Deploy Live',
                fr: 'Déployer en direct',
                ru: 'Развернуть в реальном времени',
                es: 'Desplegar en vivo',
                ar: 'نشر مباشر'
            },
            clone: {
                zh: '克隆',
                en: 'Clone',
                fr: 'Cloner',
                ru: 'Клонировать',
                es: 'Clonar',
                ar: 'استنساخ'
            },
            parameters: {
                zh: '参数',
                en: 'Parameters',
                fr: 'Paramètres',
                ru: 'Параметры',
                es: 'Parámetros',
                ar: 'المعلمات'
            },
            description: {
                zh: '描述',
                en: 'Description',
                fr: 'Description',
                ru: 'Описание',
                es: 'Descripción',
                ar: 'الوصف'
            },
            created_at: {
                zh: '创建时间',
                en: 'Created At',
                fr: 'Créé le',
                ru: 'Создано',
                es: 'Creado el',
                ar: 'تاريخ الإنشاء'
            },
            updated_at: {
                zh: '更新时间',
                en: 'Updated At',
                fr: 'Mis à jour le',
                ru: 'Обновлено',
                es: 'Actualizado el',
                ar: 'تاريخ التحديث'
            }
        },

        // -----------------------------------------------------------------
        // Backtest
        // -----------------------------------------------------------------
        backtest: {
            title: {
                zh: '回测',
                en: 'Backtest',
                fr: 'Backtest',
                ru: 'Бэктест',
                es: 'Backtest',
                ar: 'الاختبار التاريخي'
            },
            run_backtest: {
                zh: '运行回测',
                en: 'Run Backtest',
                fr: 'Lancer le backtest',
                ru: 'Запустить бэктест',
                es: 'Ejecutar backtest',
                ar: 'تشغيل الاختبار التاريخي'
            },
            start_date: {
                zh: '开始日期',
                en: 'Start Date',
                fr: 'Date de début',
                ru: 'Дата начала',
                es: 'Fecha de inicio',
                ar: 'تاريخ البدء'
            },
            end_date: {
                zh: '结束日期',
                en: 'End Date',
                fr: 'Date de fin',
                ru: 'Дата окончания',
                es: 'Fecha de fin',
                ar: 'تاريخ الانتهاء'
            },
            initial_capital: {
                zh: '初始资金',
                en: 'Initial Capital',
                fr: 'Capital initial',
                ru: 'Начальный капитал',
                es: 'Capital inicial',
                ar: 'رأس المال الأولي'
            },
            commission: {
                zh: '手续费',
                en: 'Commission',
                fr: 'Commission',
                ru: 'Комиссия',
                es: 'Comisión',
                ar: 'العمولة'
            },
            slippage: {
                zh: '滑点',
                en: 'Slippage',
                fr: 'Glissement',
                ru: 'Проскальзывание',
                es: 'Deslizamiento',
                ar: 'الانزلاق'
            },
            results: {
                zh: '回测结果',
                en: 'Backtest Results',
                fr: 'Résultats du backtest',
                ru: 'Результаты бэктеста',
                es: 'Resultados del backtest',
                ar: 'نتائج الاختبار التاريخي'
            },
            total_return: {
                zh: '总收益率',
                en: 'Total Return',
                fr: 'Rendement total',
                ru: 'Общая доходность',
                es: 'Retorno total',
                ar: 'إجمالي العائد'
            },
            sharpe_ratio: {
                zh: '夏普比率',
                en: 'Sharpe Ratio',
                fr: 'Ratio de Sharpe',
                ru: 'Коэффициент Шарпа',
                es: 'Ratio de Sharpe',
                ar: 'نسبة شارب'
            },
            max_drawdown: {
                zh: '最大回撤',
                en: 'Max Drawdown',
                fr: 'Drawdown maximum',
                ru: 'Максимальная просадка',
                es: 'Máximo drawdown',
                ar: 'أقصى انخفاض'
            },
            trades_count: {
                zh: '交易次数',
                en: 'Trades Count',
                fr: 'Nombre de trades',
                ru: 'Количество сделок',
                es: 'Número de operaciones',
                ar: 'عدد الصفقات'
            },
            equity_curve: {
                zh: '权益曲线',
                en: 'Equity Curve',
                fr: 'Courbe de capital',
                ru: 'Кривая капитала',
                es: 'Curva de capital',
                ar: 'منحنى رأس المال'
            },
            trade_log: {
                zh: '交易日志',
                en: 'Trade Log',
                fr: 'Journal des trades',
                ru: 'Журнал сделок',
                es: 'Registro de operaciones',
                ar: 'سجل الصفقات'
            }
        },

        // -----------------------------------------------------------------
        // Portfolio
        // -----------------------------------------------------------------
        portfolio: {
            title: {
                zh: '投资组合',
                en: 'Portfolio',
                fr: 'Portefeuille',
                ru: 'Портфель',
                es: 'Cartera',
                ar: 'المحفظة'
            },
            total_value: {
                zh: '总市值',
                en: 'Total Value',
                fr: 'Valeur totale',
                ru: 'Общая стоимость',
                es: 'Valor total',
                ar: 'القيمة الإجمالية'
            },
            cash: {
                zh: '现金',
                en: 'Cash',
                fr: 'Liquidités',
                ru: 'Наличные',
                es: 'Efectivo',
                ar: 'نقد'
            },
            positions: {
                zh: '持仓',
                en: 'Positions',
                fr: 'Positions',
                ru: 'Позиции',
                es: 'Posiciones',
                ar: 'المراكز'
            },
            symbol: {
                zh: '代码',
                en: 'Symbol',
                fr: 'Symbole',
                ru: 'Тикер',
                es: 'Símbolo',
                ar: 'الرمز'
            },
            quantity: {
                zh: '数量',
                en: 'Quantity',
                fr: 'Quantité',
                ru: 'Количество',
                es: 'Cantidad',
                ar: 'الكمية'
            },
            avg_price: {
                zh: '均价',
                en: 'Avg Price',
                fr: 'Prix moyen',
                ru: 'Средняя цена',
                es: 'Precio promedio',
                ar: 'متوسط السعر'
            },
            current_price: {
                zh: '现价',
                en: 'Current Price',
                fr: 'Prix actuel',
                ru: 'Текущая цена',
                es: 'Precio actual',
                ar: 'السعر الحالي'
            },
            unrealized_pnl: {
                zh: '未实现盈亏',
                en: 'Unrealized P&L',
                fr: 'P&P non réalisé',
                ru: 'Нереализованный P&L',
                es: 'P&L no realizado',
                ar: 'الربح/الخسارة غير المحققة'
            },
            allocation: {
                zh: '配置',
                en: 'Allocation',
                fr: 'Allocation',
                ru: 'Распределение',
                es: 'Asignación',
                ar: 'التخصيص'
            }
        },

        // -----------------------------------------------------------------
        // Live Trading
        // -----------------------------------------------------------------
        live_trading: {
            title: {
                zh: '实盘交易',
                en: 'Live Trading',
                fr: 'Trading en direct',
                ru: 'Живая торговля',
                es: 'Trading en vivo',
                ar: 'التداول المباشر'
            },
            start_bot: {
                zh: '启动机器人',
                en: 'Start Bot',
                fr: 'Démarrer le bot',
                ru: 'Запустить бота',
                es: 'Iniciar bot',
                ar: 'تشغيل الروبوت'
            },
            stop_bot: {
                zh: '停止机器人',
                en: 'Stop Bot',
                fr: 'Arrêter le bot',
                ru: 'Остановить бота',
                es: 'Detener bot',
                ar: 'إيقاف الروبوت'
            },
            running: {
                zh: '运行中',
                en: 'Running',
                fr: 'En cours',
                ru: 'Работает',
                es: 'En ejecución',
                ar: 'قيد التشغيل'
            },
            stopped: {
                zh: '已停止',
                en: 'Stopped',
                fr: 'Arrêté',
                ru: 'Остановлен',
                es: 'Detenido',
                ar: 'متوقف'
            },
            open_orders: {
                zh: '当前订单',
                en: 'Open Orders',
                fr: 'Ordres ouverts',
                ru: 'Открытые ордера',
                es: 'Órdenes abiertas',
                ar: 'الأوامر المفتوحة'
            },
            order_history: {
                zh: '订单历史',
                en: 'Order History',
                fr: 'Historique des ordres',
                ru: 'История ордеров',
                es: 'Historial de órdenes',
                ar: 'تاريخ الأوامر'
            },
            buy: {
                zh: '买入',
                en: 'Buy',
                fr: 'Acheter',
                ru: 'Купить',
                es: 'Comprar',
                ar: 'شراء'
            },
            sell: {
                zh: '卖出',
                en: 'Sell',
                fr: 'Vendre',
                ru: 'Продать',
                es: 'Vender',
                ar: 'بيع'
            },
            side: {
                zh: '方向',
                en: 'Side',
                fr: 'Côté',
                ru: 'Сторона',
                es: 'Lado',
                ar: 'الاتجاه'
            },
            price: {
                zh: '价格',
                en: 'Price',
                fr: 'Prix',
                ru: 'Цена',
                es: 'Precio',
                ar: 'السعر'
            },
            amount: {
                zh: '金额',
                en: 'Amount',
                fr: 'Montant',
                ru: 'Сумма',
                es: 'Importe',
                ar: 'المبلغ'
            },
            filled: {
                zh: '已成交',
                en: 'Filled',
                fr: 'Exécuté',
                ru: 'Исполнено',
                es: 'Ejecutado',
                ar: 'منفذ'
            },
            time: {
                zh: '时间',
                en: 'Time',
                fr: 'Heure',
                ru: 'Время',
                es: 'Hora',
                ar: 'الوقت'
            }
        },

        // -----------------------------------------------------------------
        // Data Center
        // -----------------------------------------------------------------
        data_center: {
            title: {
                zh: '数据中心',
                en: 'Data Center',
                fr: 'Centre de données',
                ru: 'Центр данных',
                es: 'Centro de datos',
                ar: 'مركز البيانات'
            },
            instruments: {
                zh: '交易品种',
                en: 'Instruments',
                fr: 'Instruments',
                ru: 'Инструменты',
                es: 'Instrumentos',
                ar: 'الأدوات'
            },
            data_feeds: {
                zh: '数据源',
                en: 'Data Feeds',
                fr: 'Flux de données',
                ru: 'Потоки данных',
                es: 'Fuentes de datos',
                ar: 'تدفقات البيانات'
            },
            import_data: {
                zh: '导入数据',
                en: 'Import Data',
                fr: 'Importer des données',
                ru: 'Импорт данных',
                es: 'Importar datos',
                ar: 'استيراد البيانات'
            },
            export_data: {
                zh: '导出数据',
                en: 'Export Data',
                fr: 'Exporter des données',
                ru: 'Экспорт данных',
                es: 'Exportar datos',
                ar: 'تصدير البيانات'
            },
            timeframe: {
                zh: '时间周期',
                en: 'Timeframe',
                fr: 'Intervalle',
                ru: 'Таймфрейм',
                es: 'Temporalidad',
                ar: 'الإطار الزمني'
            },
            last_update: {
                zh: '最后更新',
                en: 'Last Update',
                fr: 'Dernière mise à jour',
                ru: 'Последнее обновление',
                es: 'Última actualización',
                ar: 'آخر تحديث'
            }
        },

        // -----------------------------------------------------------------
        // Validation & Errors
        // -----------------------------------------------------------------
        validation: {
            required: {
                zh: '此字段为必填项',
                en: 'This field is required',
                fr: 'Ce champ est obligatoire',
                ru: 'Это поле обязательно',
                es: 'Este campo es obligatorio',
                ar: 'هذا الحقل مطلوب'
            },
            invalid_email: {
                zh: '请输入有效的电子邮件地址',
                en: 'Please enter a valid email address',
                fr: 'Veuillez saisir une adresse e-mail valide',
                ru: 'Введите действительный адрес электронной почты',
                es: 'Por favor, introduzca un correo electrónico válido',
                ar: 'يرجى إدخال عنوان بريد إلكتروني صالح'
            },
            min_length: {
                zh: '至少需要 {{min}} 个字符',
                en: 'At least {{min}} characters required',
                fr: 'Au moins {{min}} caractères requis',
                ru: 'Требуется не менее {{min}} символов',
                es: 'Se requieren al menos {{min}} caracteres',
                ar: 'مطلوب {{min}} أحرف على الأقل'
            },
            max_length: {
                zh: '最多允许 {{max}} 个字符',
                en: 'Maximum {{max}} characters allowed',
                fr: 'Maximum {{max}} caractères autorisés',
                ru: 'Допускается не более {{max}} символов',
                es: 'Máximo {{max}} caracteres permitidos',
                ar: 'الحد الأقصى {{max}} حرف مسموح به'
            },
            invalid_number: {
                zh: '请输入有效的数字',
                en: 'Please enter a valid number',
                fr: 'Veuillez saisir un nombre valide',
                ru: 'Введите действительное число',
                es: 'Por favor, introduzca un número válido',
                ar: 'يرجى إدخال رقم صالح'
            },
            positive_number: {
                zh: '请输入正数',
                en: 'Please enter a positive number',
                fr: 'Veuillez saisir un nombre positif',
                ru: 'Введите положительное число',
                es: 'Por favor, introduzca un número positivo',
                ar: 'يرجى إدخال رقم موجب'
            },
            password_mismatch: {
                zh: '密码不匹配',
                en: 'Passwords do not match',
                fr: 'Les mots de passe ne correspondent pas',
                ru: 'Пароли не совпадают',
                es: 'Las contraseñas no coinciden',
                ar: 'كلمات المرور غير متطابقة'
            }
        },

        // -----------------------------------------------------------------
        // Auth
        // -----------------------------------------------------------------
        auth: {
            login: {
                zh: '登录',
                en: 'Login',
                fr: 'Connexion',
                ru: 'Вход',
                es: 'Iniciar sesión',
                ar: 'تسجيل الدخول'
            },
            register: {
                zh: '注册',
                en: 'Register',
                fr: 'Inscription',
                ru: 'Регистрация',
                es: 'Registrarse',
                ar: 'التسجيل'
            },
            username: {
                zh: '用户名',
                en: 'Username',
                fr: 'Nom d\'utilisateur',
                ru: 'Имя пользователя',
                es: 'Nombre de usuario',
                ar: 'اسم المستخدم'
            },
            password: {
                zh: '密码',
                en: 'Password',
                fr: 'Mot de passe',
                ru: 'Пароль',
                es: 'Contraseña',
                ar: 'كلمة المرور'
            },
            confirm_password: {
                zh: '确认密码',
                en: 'Confirm Password',
                fr: 'Confirmer le mot de passe',
                ru: 'Подтвердите пароль',
                es: 'Confirmar contraseña',
                ar: 'تأكيد كلمة المرور'
            },
            email: {
                zh: '邮箱',
                en: 'Email',
                fr: 'E-mail',
                ru: 'Электронная почта',
                es: 'Correo electrónico',
                ar: 'البريد الإلكتروني'
            },
            remember_me: {
                zh: '记住我',
                en: 'Remember me',
                fr: 'Se souvenir de moi',
                ru: 'Запомнить меня',
                es: 'Recuérdame',
                ar: 'تذكرني'
            },
            forgot_password: {
                zh: '忘记密码？',
                en: 'Forgot password?',
                fr: 'Mot de passe oublié ?',
                ru: 'Забыли пароль?',
                es: '¿Olvidó su contraseña?',
                ar: 'هل نسيت كلمة المرور؟'
            },
            login_failed: {
                zh: '登录失败，请检查您的凭据',
                en: 'Login failed. Please check your credentials.',
                fr: 'Échec de la connexion. Veuillez vérifier vos identifiants.',
                ru: 'Ошибка входа. Проверьте свои учётные данные.',
                es: 'Error de inicio de sesión. Por favor, verifique sus credenciales.',
                ar: 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.'
            },
            session_expired: {
                zh: '会话已过期，请重新登录',
                en: 'Session expired. Please log in again.',
                fr: 'Session expirée. Veuillez vous reconnecter.',
                ru: 'Сессия истекла. Пожалуйста, войдите снова.',
                es: 'Sesión expirada. Por favor, inicie sesión de nuevo.',
                ar: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
            }
        }
    };

    // ===================================================================
    // State
    // ===================================================================
    var currentLang = DEFAULT_LANGUAGE;
    var changeCallbacks = [];
    var initialized = false;

    // ===================================================================
    // Private Helpers
    // ===================================================================

    /**
     * Safely retrieve nested translation value by dot-notation key.
     */
    function getNestedValue(obj, keyPath) {
        if (!keyPath) return undefined;
        var parts = keyPath.split('.');
        var value = obj;
        for (var i = 0; i < parts.length; i++) {
            if (value == null || typeof value !== 'object') {
                return undefined;
            }
            value = value[parts[i]];
        }
        return value;
    }

    /**
     * Detect browser language and map to supported language code.
     */
    function detectBrowserLanguage() {
        var nav = global.navigator;
        if (!nav) return DEFAULT_LANGUAGE;

        var candidates = [];
        if (nav.languages && Array.isArray(nav.languages)) {
            for (var i = 0; i < nav.languages.length; i++) {
                candidates.push(nav.languages[i]);
            }
        }
        if (nav.language) candidates.push(nav.language);
        if (nav.userLanguage) candidates.push(nav.userLanguage);
        if (nav.browserLanguage) candidates.push(nav.browserLanguage);
        if (nav.systemLanguage) candidates.push(nav.systemLanguage);

        for (var j = 0; j < candidates.length; j++) {
            var raw = (candidates[j] || '').toLowerCase().replace(/_/g, '-');
            // Direct match
            if (SUPPORTED_LANGUAGES[raw]) return raw;
            // Match primary language subtag (e.g., "zh-CN" -> "zh")
            var primary = raw.split('-')[0];
            if (SUPPORTED_LANGUAGES[primary]) return primary;
        }

        return DEFAULT_LANGUAGE;
    }

    /**
     * Persist selected language to localStorage.
     */
    function persistLanguage(lang) {
        try {
            if (global.localStorage) {
                global.localStorage.setItem(STORAGE_KEY, lang);
            }
        } catch (e) {
            // Ignore storage errors (e.g., private mode)
        }
    }

    /**
     * Retrieve persisted language from localStorage.
     */
    function loadPersistedLanguage() {
        try {
            if (global.localStorage) {
                var stored = global.localStorage.getItem(STORAGE_KEY);
                if (stored && SUPPORTED_LANGUAGES[stored]) {
                    return stored;
                }
            }
        } catch (e) {
            // Ignore storage errors
        }
        return null;
    }

    /**
     * Apply or remove RTL direction on the document root.
     */
    function applyRTLDirection(lang) {
        var doc = global.document;
        if (!doc || !doc.documentElement) return;

        var html = doc.documentElement;
        var isRtl = RTL_LANGUAGES.indexOf(lang) !== -1;

        if (isRtl) {
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', lang);
        } else {
            html.setAttribute('dir', 'ltr');
            html.setAttribute('lang', lang);
        }
    }

    /**
     * Interpolate placeholders in a translation string.
     * Supports both {{key}} and {key} syntax.
     */
    function interpolate(template, params) {
        if (!template || typeof template !== 'string') return template;
        if (!params || typeof params !== 'object') return template;

        return template
            .replace(/\{\{(\w+)\}\}/g, function(match, key) {
                return params.hasOwnProperty(key) ? String(params[key]) : match;
            })
            .replace(/\{(\w+)\}/g, function(match, key) {
                return params.hasOwnProperty(key) ? String(params[key]) : match;
            });
    }

    /**
     * Trigger all registered change callbacks.
     */
    function notifyChange(oldLang, newLang) {
        for (var i = 0; i < changeCallbacks.length; i++) {
            try {
                changeCallbacks[i](newLang, oldLang);
            } catch (err) {
                if (global.console && global.console.error) {
                    global.console.error('I18N change callback error:', err);
                }
            }
        }
    }

    // ===================================================================
    // Public API
    // ===================================================================

    var I18N = {

        /**
         * Initialize the I18N engine.
         * Loads persisted language or auto-detects browser language.
         */
        init: function() {
            if (initialized) {
                return this;
            }

            var lang = loadPersistedLanguage();
            if (!lang) {
                lang = detectBrowserLanguage();
            }
            if (!SUPPORTED_LANGUAGES[lang]) {
                lang = DEFAULT_LANGUAGE;
            }

            currentLang = lang;
            applyRTLDirection(currentLang);
            initialized = true;

            // Auto-translate the page if DOM is ready
            if (global.document) {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                        I18N.translatePage();
                    });
                } else {
                    // DOM already loaded
                    this.translatePage();
                }
            }

            return this;
        },

        /**
         * Set the active language dynamically (no page reload).
         * @param {string} lang - Language code (zh, en, fr, ru, es, ar)
         */
        setLanguage: function(lang) {
            if (!SUPPORTED_LANGUAGES[lang]) {
                if (global.console && global.console.warn) {
                    global.console.warn('I18N: Unsupported language "' + lang + '"');
                }
                return this;
            }

            if (lang === currentLang) {
                return this;
            }

            var oldLang = currentLang;
            currentLang = lang;
            persistLanguage(lang);
            applyRTLDirection(lang);
            this.translatePage();
            notifyChange(oldLang, lang);

            return this;
        },

        /**
         * Translate a key (dot-notation) with optional interpolation parameters.
         * Priority: external locale > internal TRANSLATIONS > fallback
         * @param {string} key - Translation key, e.g., "global.save"
         * @param {object} [params] - Interpolation parameters, e.g., {min: 5}
         * @returns {string} Translated string or the key itself if not found.
         */
        t: function(key, params) {
            if (!key || typeof key !== 'string') return '';

            // 1. Try external locale file (window.ATS_LOCALE_XX)
            var externalLocale = global['ATS_LOCALE_' + currentLang.toUpperCase()];
            if (externalLocale) {
                var extVal = getNestedValue(externalLocale, key);
                if (extVal && typeof extVal === 'string') {
                    return interpolate(extVal, params);
                }
            }

            // 2. Try default language external locale
            if (currentLang !== DEFAULT_LANGUAGE) {
                var defaultLocale = global['ATS_LOCALE_' + DEFAULT_LANGUAGE.toUpperCase()];
                if (defaultLocale) {
                    var defExtVal = getNestedValue(defaultLocale, key);
                    if (defExtVal && typeof defExtVal === 'string') {
                        return interpolate(defExtVal, params);
                    }
                }
            }

            // 3. Try internal TRANSLATIONS dictionary
            var dict = getNestedValue(TRANSLATIONS, key);
            var raw = (dict && dict[currentLang]) ? dict[currentLang] : null;
            if (!raw) {
                raw = (dict && dict[DEFAULT_LANGUAGE]) ? dict[DEFAULT_LANGUAGE] : null;
            }
            if (raw) {
                return interpolate(raw, params);
            }

            // 4. Return key as fallback
            return key;
        },

        /**
         * Scan the DOM and translate elements with data-i18n attributes.
         * Supported attributes:
         *   - data-i18n          -> innerText
         *   - data-i18n-placeholder -> placeholder
         *   - data-i18n-title    -> title
         */
        translatePage: function() {
            var doc = global.document;
            if (!doc) return this;

            // data-i18n -> textContent
            var textNodes = doc.querySelectorAll('[data-i18n]');
            for (var i = 0; i < textNodes.length; i++) {
                var el = textNodes[i];
                var key = el.getAttribute('data-i18n');
                if (key) {
                    var translated = this.t(key);
                    if (translated !== key) {
                        el.textContent = translated;
                    }
                }
            }

            // data-i18n-placeholder -> placeholder
            var placeholderNodes = doc.querySelectorAll('[data-i18n-placeholder]');
            for (var j = 0; j < placeholderNodes.length; j++) {
                var pel = placeholderNodes[j];
                var pkey = pel.getAttribute('data-i18n-placeholder');
                if (pkey) {
                    var ptranslated = this.t(pkey);
                    if (ptranslated !== pkey) {
                        pel.setAttribute('placeholder', ptranslated);
                    }
                }
            }

            // data-i18n-title -> title
            var titleNodes = doc.querySelectorAll('[data-i18n-title]');
            for (var k = 0; k < titleNodes.length; k++) {
                var tel = titleNodes[k];
                var tkey = tel.getAttribute('data-i18n-title');
                if (tkey) {
                    var ttranslated = this.t(tkey);
                    if (ttranslated !== tkey) {
                        tel.setAttribute('title', ttranslated);
                    }
                }
            }

            // Update lang attribute on html element
            if (doc.documentElement) {
                doc.documentElement.setAttribute('lang', currentLang);
            }

            return this;
        },

        /**
         * Register a callback to be invoked when the language changes.
         * @param {function} callback - Function(newLang, oldLang)
         * @returns {function} Unsubscribe function.
         */
        onChange: function(callback) {
            if (typeof callback !== 'function') {
                return function() {};
            }
            changeCallbacks.push(callback);

            // Return unsubscribe function
            return function() {
                var idx = changeCallbacks.indexOf(callback);
                if (idx !== -1) {
                    changeCallbacks.splice(idx, 1);
                }
            };
        },

        /**
         * Get the currently active language code.
         * @returns {string}
         */
        getCurrentLang: function() {
            return currentLang;
        },

        /**
         * Check if the current language is RTL.
         * @returns {boolean}
         */
        isRTL: function() {
            return RTL_LANGUAGES.indexOf(currentLang) !== -1;
        },

        /**
         * Get the list of supported language codes.
         * @returns {string[]}
         */
        getSupportedLangs: function() {
            return Object.keys(SUPPORTED_LANGUAGES);
        },

        /**
         * Get display metadata for a supported language.
         * @param {string} [lang] - Language code. Defaults to current language.
         * @returns {object|null} {name, native, dir}
         */
        getLangDisplay: function(lang) {
            var target = lang || currentLang;
            return SUPPORTED_LANGUAGES[target] || null;
        },

        /**
         * Add or override translations dynamically at runtime.
         * Useful for plugin/modules that load their own translation bundles.
         * @param {string} namespace - Top-level namespace, e.g. "myPlugin"
         * @param {object} translations - Nested translation object
         */
        addTranslations: function(namespace, translations) {
            if (!namespace || typeof translations !== 'object') return this;
            TRANSLATIONS[namespace] = translations;
            return this;
        },

        /**
         * Reload translation dictionary from a remote source (optional utility).
         * @param {string} url - JSON endpoint returning translation object
         * @param {function} [callback] - Called with (err) when complete
         */
        loadRemote: function(url, callback) {
            if (!global.fetch) {
                if (callback) callback(new Error('fetch not supported'));
                return this;
            }
            fetch(url)
                .then(function(res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function(data) {
                    if (data && typeof data === 'object') {
                        // Merge into TRANSLATIONS
                        var keys = Object.keys(data);
                        for (var i = 0; i < keys.length; i++) {
                            var k = keys[i];
                            TRANSLATIONS[k] = data[k];
                        }
                        I18N.translatePage();
                    }
                    if (callback) callback(null);
                })
                .catch(function(err) {
                    if (callback) callback(err);
                });
            return this;
        }
    };

    // ===================================================================
    // Export
    // ===================================================================
    global.I18N = I18N;

    // Auto-init if running in browser environment
    if (global.document && global.document.readyState) {
        I18N.init();
    }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
