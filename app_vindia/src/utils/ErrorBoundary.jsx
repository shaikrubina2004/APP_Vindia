// src/utils/ErrorBoundary.jsx
import { Component } from "react";

/**
 * Wrap any section that might crash independently.
 * Prevents one broken component from killing the entire page.
 *
 * Usage:
 *   <ErrorBoundary label="Chart">
 *     <Bar data={...} />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "10px",
            background: "#fff5f5",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ⚠️ {this.props.label || "This section"} failed to load.{" "}
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#b91c1c",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "12px",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}