import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getVKBotStatus, type VKBotStatus } from "../../api/vk";
import Modal from "../Modal/Modal";
import AppButton from "../UI/Button";

export const VK_BOT_CONFIRMATION_REQUIRED_KEY = "vk_bot_confirmation_required_v1";

export function requireVKBotConfirmation() {
  localStorage.setItem(VK_BOT_CONFIRMATION_REQUIRED_KEY, "1");
}

export default function VKBotConfirmationGuard() {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState<VKBotStatus | null>(null);
  const [open, setOpen] = useState(false);

  const shouldCheck = Boolean(user && user.role === "student" && !user.vkConfirmed && localStorage.getItem(VK_BOT_CONFIRMATION_REQUIRED_KEY) === "1");

  const refresh = async () => {
    if (!shouldCheck) return;
    try {
      const nextStatus = await getVKBotStatus();
      setStatus(nextStatus);
      if (nextStatus.confirmed) {
        localStorage.removeItem(VK_BOT_CONFIRMATION_REQUIRED_KEY);
        setOpen(false);
        return;
      }
      setOpen(true);
    } catch {
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!shouldCheck) {
      setOpen(false);
      return;
    }

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [shouldCheck]);

  if (!shouldCheck) return null;

  const botUrl = status?.botUrl || user?.vkBotUrl || "";

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Подтвердите VK-бота" hideActions>
      <div className="vk-bot-confirmation">
        <p>
          Чтобы получать сообщения по заявке и организационному чату, перейдите в VK-бота и нажмите кнопку «Начать».
          Окно будет появляться раз в минуту, пока бот не подтвердит ваш VK.
        </p>
        <div className="vk-bot-confirmation__actions">
          {botUrl && (
            <AppButton onClick={() => window.open(botUrl, "_blank", "noopener,noreferrer")}>Открыть VK-бота</AppButton>
          )}
          <AppButton onClick={refresh}>Проверить подтверждение</AppButton>
        </div>
      </div>
    </Modal>
  );
}
