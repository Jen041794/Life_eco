import { createContext, useContext, useCallback, useState } from "react";
import { ToastContainer, Toast } from "react-bootstrap";

// 全站共用的 Toast 通知系統。
// 用法：在任何元件 `const { showToast } = useToast()`，再呼叫 `showToast("訊息")`
// 或 `showToast("失敗訊息", "danger")`。通知會出現在畫面右下角、2.5 秒自動消失。
const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast 必須包在 <ToastProvider> 內");
  return ctx;
}

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // variant：'success'（綠，預設）/ 'danger'（紅）等 Bootstrap 顏色
  const showToast = useCallback((message, variant = "success") => {
    const id = ++idSeq;
    setToasts((list) => [...list, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1100 }}>
        {toasts.map((t) => (
          <Toast
            key={t.id}
            bg={t.variant}
            onClose={() => remove(t.id)}
            delay={2500}
            autohide
          >
            <Toast.Body className="text-white d-flex align-items-center">
              <i
                className={`bi ${
                  t.variant === "danger" ? "bi-x-circle-fill" : "bi-check-circle-fill"
                } me-2`}
              ></i>
              {t.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}
