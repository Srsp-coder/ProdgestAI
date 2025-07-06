import React, { useEffect, useRef, useState } from "react";

function ProdResponse({ response, onRegenerate, scrollRef, hasQueried }) {
  const scrollToTop = () => {
    setTimeout(() => {
      if (scrollRef?.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToTop();
  }, [response]);

  if (hasQueried && (!response || response.length === 0)) {
    return (
      <p style={{ fontStyle: "italic", color: "gray" }}>
        No matching products found.
      </p>
    );
  }

  if (!hasQueried) {
    return null; // 👈 Don’t show anything before first search
  }

  return (
    <div className="product-response">
      <h3
        style={{
          fontWeight: "bold",
          fontSize: "1.8rem",
          color: "#4B352A",
          fontFamily: "'Chakra Petch', sans-serif",
        }}
      >
        Matching Products 🛍️
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
          marginTop: "1rem",
        }}
      >
        {response.map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "10px",
              backgroundColor: "#fffce7",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.2)",
              transition: "transform 0.2s ease-in-out",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.02)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img
              src={product.image || "/fallback.png"}
              alt={product.name}
              style={{
                width: "100%",
                height: "150px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
            <h4
              style={{
                margin: "10px 0 5px",
                fontSize: "1.1rem",
                fontWeight: "600",
                color: "#222",
              }}
            >
              {product.name}
            </h4>
            <p style={{ margin: 0, color: "#444", fontSize: "0.95rem" }}>
              Category: <strong>{product.category}</strong>
            </p>
            <p
              style={{
                fontWeight: "bold",
                fontSize: "1.1rem",
                color: "#C0392B",
              }}
            >
              ₹ {product.price}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <button
          onClick={onRegenerate}
          style={{
            padding: "8px 18px",
            fontSize: "1rem",
            fontWeight: "500",
            borderRadius: "8px",
            backgroundColor: "#FF5F5F",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "3px 3px 0px #222",
          }}
        >
          🔁 Regenerate Suggestions
        </button>
      </div>
    </div>
  );
}

export default ProdResponse;
