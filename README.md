# SkyRoute Analytics

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Framework](https://img.shields.io/badge/Next.js-App_Router-black)](https://nextjs.org/)
[![Deployment](https://img.shields.io/badge/Vercel-Ready-black)](https://vercel.com/)

## 1. Overview
[cite_start]SkyRoute Analytics is a highly optimized client-side web application designed to demonstrate the implementation of shortest-path routing algorithms (Dijkstra/A*) using graph theory[cite: 1]. [cite_start]Developed to fulfill the Discrete Mathematics Final Project standards, this application transforms logical computation into a modern web interface[cite: 2].

[cite_start]The system serves as a professional, applied case study showcasing the capability of Computer Engineering students at Institut Teknologi Sepuluh Nopember (ITS) to solve real-world aviation challenges[cite: 3]. [cite_start]It utilizes an authentic domestic airline route network and integrates real-time No-Fly Zone (geofencing) variables to dynamically recalculate flight paths[cite: 4].

## 2. Technical Stack & Infrastructure

[cite_start]The architecture prioritizes client-side execution for cost-efficiency, reinforced by Web Workers to prevent thread blocking during heavy graph traversal[cite: 5].

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) / React | [cite_start]Ensures optimal modern ecosystem integration and responsive rendering for airport graphs[cite: 5, 6]. |
| **Styling & UI** | Tailwind CSS | [cite_start]Implements a Y2K retro-futuristic aesthetic, emphasizing a cyber-dashboard navigation instrument design[cite: 6]. |
| **Algorithm Logic** | TypeScript / Web Workers | [cite_start]Pure client-side Dijkstra/A* processing, keeping the Vercel deployment lightweight. |
| **API Integration** | Mission Planner / Open API | Retrieves coordinate data for No-Fly Zones in real-time[cite: 8]. |

## 3. Core Scope & Capabilities

* [cite_start]**Real-World Graph Dataset:** Operates on an accurate, weighted graph structure (Nodes and Edges) mapped from the actual flight network of a specific Indonesian commercial airline[cite: 9]. 
* [cite_start]**Dynamic Routing (No-Fly Zone):** Integrates Mission Planner API (or similar geofencing data) to extract precise No-Fly Zone coordinates[cite: 10].
* [cite_start]**Autonomous Recalculation:** The system automatically recalculates alternative routes if the primary flight path intersects a restricted zone[cite: 11].
* [cite_start]**Edge Case Handling:** Prevents logical defects, including input rejection for identical origin and destination airports, and handles disconnected graph scenarios.

## 4. Team Structure & Responsibilities

* [cite_start]**Project Manager / System Analyst:** Governs the project brief, enforces Final Project standards, and manages the feature-to-timeline ratio[cite: 13].
* [cite_start]**UI/UX Designer:** Delivers comprehensive design references and focuses on the visual representation of active No-Fly Zone alerts[cite: 14].
* [cite_start]**Frontend Developer:** Translates designs into Next.js, manages map layouts, and handles visual state changes triggered by API blocking data[cite: 15].
* [cite_start]**Algorithm Engineer (Path Planner):** Architects the mathematical Dijkstra/A* logic[cite: 16]. Responsible for dynamically assigning maximum weight (infinity/severed) to blocked edges based on API data, forcing route recalculation[cite: 16].
* [cite_start]**Integration Specialist:** Fetches Mission Planner API data, transforms it into an algorithm-compatible format, and renders it as "Red Zones" on the UI[cite: 17].
* [cite_start]**DevOps / Deployment:** Maintains the GitHub repository structure and ensures deployment stability on Vercel[cite: 18].

## 5. Development Workflow

* [cite_start]**Data Sourcing:** The team will agree upon one specific airline at the project's inception[cite: 19]. [cite_start]Official routes will be extracted into a static JSON format containing IATA codes and distances, acting as the primary graph dataset[cite: 20].
* [cite_start]**Version Control (Git):** Strict branching strategy (`main` for Vercel production, `dev` for integration) requiring Pull Requests (PR) prior to merging[cite: 21].
* [cite_start]**Architecture:** Component-Driven Design is enforced to build modular interfaces and streamline revisions[cite: 22].

## 6. Risk Mitigation

| Risk | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **API Mission Planner Limit/Down** | High | [cite_start]Implement static JSON mock data containing artificial No-Fly Zone coordinates as a fallback mechanism for the live demonstration[cite: 23, 24]. |
| **Logic & UI Integration Conflicts** | High | Decouple Path Planner logic into isolated modules; [cite_start]Frontend utilizes dummy data until the final JSON schema is agreed upon[cite: 24, 25]. |
| **Geospatial Rendering Overhead** | Medium | [cite_start]Fallback to a static 2D graph visualization representing airport nodes if dynamic geographical mapping consumes excessive compute/time[cite: 26]. |

## 7. Timeline & Success Criteria

**Sprint Schedule (4 Weeks):**
* [cite_start]**Week 1:** Airline selection, JSON route extraction, UI reference design, and Repo/Vercel initialization[cite: 27].
* [cite_start]**Week 2:** UI layout construction and finalization of core Dijkstra logic (validated via `console.log`)[cite: 28].
* [cite_start]**Week 3:** Mission Planner API integration, UI-logic synchronization, and dynamic routing tests[cite: 29].
* [cite_start]**Week 4:** Bug tracking, edge case validation, and final Vercel deployment[cite: 30].

**Success Criteria:**
[cite_start]The application must execute seamless path recalculations upon No-Fly Zone activation, strictly adhering to discrete graph principles without critical logical failures during the Final Project demonstration[cite: 30].
