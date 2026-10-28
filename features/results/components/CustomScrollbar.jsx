import "./CustomScrollbar.css";

export default function CustomScrollbar({
  as: Component = "div",
  className = "",
  children,
  ...props
}) {
  const mergedClassName =
    className ? `custom-scrollbar ${className}` : "custom-scrollbar";

  return (
    <Component className={mergedClassName} {...props}>
      {children}
    </Component>
  );
}
