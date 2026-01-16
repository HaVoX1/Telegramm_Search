import { useEffect, useState } from 'react';

interface TelegramWebAppData {
  isReady: boolean;
  user: {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
    languageCode?: string;
  } | null;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bgColor?: string;
    textColor?: string;
    hintColor?: string;
    linkColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  };
}

export const useTelegramWebApp = (): TelegramWebAppData => {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramWebAppData['user']>(null);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [themeParams, setThemeParams] = useState<TelegramWebAppData['themeParams']>({});

  useEffect(() => {
    try {
      // Проверяем доступность Telegram WebApp API
      const tg = window.Telegram?.WebApp;
      
      if (tg) {
        // Инициализируем Telegram WebApp
        tg.ready();
        tg.expand();
        
        // Устанавливаем данные пользователя
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
          setUser({
            id: tgUser.id,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
            username: tgUser.username,
            languageCode: tgUser.language_code,
          });
        }

        // Устанавливаем тему
        setColorScheme(tg.colorScheme);
        setThemeParams({
          bgColor: tg.themeParams.bg_color,
          textColor: tg.themeParams.text_color,
          hintColor: tg.themeParams.hint_color,
          linkColor: tg.themeParams.link_color,
          buttonColor: tg.themeParams.button_color,
          buttonTextColor: tg.themeParams.button_text_color,
        });

        // Отключаем вертикальные свайпы для закрытия
        tg.disableVerticalSwipes();
      }

      setIsReady(true);
    } catch (error) {
      console.error('Ошибка инициализации Telegram WebApp:', error);
      // В случае ошибки или если не в Telegram, используем дефолтные значения
      setIsReady(true);
    }
  }, []);

  return {
    isReady,
    user,
    colorScheme,
    themeParams,
  };
};
