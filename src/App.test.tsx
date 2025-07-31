import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import SplashScreen from "./components/SplashScreen";

// Simple test that doesn't import any components to verify Jest works
test("basic Jest functionality", () => {
  expect(1 + 1).toBe(2);
});

test("DOM testing library works", () => {
  const div = document.createElement("div");
  div.textContent = "Hello World";
  expect(div).toHaveTextContent("Hello World");
});

test("renders SplashScreen component", () => {
  render(<SplashScreen />);
  expect(screen.getByText("Tamerlane")).toBeInTheDocument();
});


