type NotificationType = 'info' | 'success' | 'error';

type NotificationOptions = {
  type?: NotificationType;
  duration?: number;
};

const STACK_ID = 'notificationStack';
const DEFAULT_DURATION = 3200;

function ensureStack(): HTMLElement {
  let stack = document.getElementById(STACK_ID);
  if (!stack) {
    stack = document.createElement('div');
    stack.id = STACK_ID;
    stack.className = 'notification-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function getIcon(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'check_circle';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

export function showNotification(message: string, options: NotificationOptions = {}): void {
  if (!message) {
    return;
  }

  const type: NotificationType = options.type || 'info';
  const duration = options.duration ?? DEFAULT_DURATION;
  const stack = ensureStack();

  const item = document.createElement('div');
  item.className = `notification notification-${type}`;

  const iconEl = document.createElement('span');
  iconEl.className = 'material-icons notification-icon';
  iconEl.textContent = getIcon(type);

  const textEl = document.createElement('div');
  textEl.className = 'notification-message';
  textEl.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.setAttribute('aria-label', '閉じる');
  closeBtn.innerHTML = '&times;';

  const remove = () => {
    item.classList.add('notification-leave');
    setTimeout(() => item.remove(), 220);
  };

  closeBtn.addEventListener('click', event => {
    event.stopPropagation();
    remove();
  });

  item.addEventListener('click', remove);

  const content = document.createElement('div');
  content.className = 'notification-content';
  content.appendChild(iconEl);
  content.appendChild(textEl);

  item.appendChild(content);
  item.appendChild(closeBtn);
  stack.appendChild(item);

  if (duration > 0) {
    setTimeout(remove, duration);
  }
}
