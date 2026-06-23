import React from "react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);
  return /* @__PURE__ */ React.createElement("div", { className: "flex min-h-screen items-center justify-center bg-muted" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("h1", { className: "mb-4 text-4xl font-bold" }, "404"), /* @__PURE__ */ React.createElement("p", { className: "mb-4 text-xl text-muted-foreground" }, "Oops! Page not found"), /* @__PURE__ */ React.createElement("a", { href: "/", className: "text-primary underline hover:text-primary/90" }, "Return to Home")));
};
export default NotFound;
