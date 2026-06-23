import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock router hooks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ key: "test-key" }),
}));

// Mock authentication hook
let authState = {
  user: { id: "test-user-id", email: "writer@chromawrite.local" },
  loading: false,
  logout: vi.fn(),
};
const mockUseAuth = vi.fn(() => authState);
vi.mock("@/lib/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock story store functions
const mockLoadStories = vi.fn(async () => [
  {
    id: "story_1",
    title: "Test Story 1",
    snippet: "Snippet text...",
    mood: "Happiness",
    moodColor: "hsl(45 85% 55%)",
    moodClass: "mood-resolve",
    wordCount: 150,
    chromaticArc: ["hsl(45 85% 55%)", "hsl(35 80% 50%)"],
    content: "Full story content...",
    createdAt: Date.now() - 3600000,
    lastEdited: "1 hour ago",
    elapsedMinutes: 10,
    savedArcPoints: [],
    sceneGallery: [],
  }
]);
vi.mock("@/lib/storyStore", () => ({
  loadStories: (uid) => mockLoadStories(uid),
  deleteStory: vi.fn(),
}));

// Import component under test
import Index from "../pages/Index";

describe("Dashboard Page Rendering", () => {
  it("should render successfully when logged in", async () => {
    authState = {
      user: { id: "test-user-id", email: "writer@chromawrite.local" },
      loading: false,
      logout: vi.fn(),
    };
    const { container } = render(<Index />);
    expect(container).toBeDefined();

    // Check if header is rendered
    await waitFor(() => {
      expect(screen.getByText("ChromaWrite")).toBeInTheDocument();
    });
  });

  it("should handle loading state", async () => {
    authState = {
      user: null,
      loading: true,
      logout: vi.fn(),
    };
    const { container } = render(<Index />);
    expect(container).toBeDefined();
  });

  it("should navigate to / if not logged in", async () => {
    authState = {
      user: null,
      loading: false,
      logout: vi.fn(),
    };
    render(<Index />);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
