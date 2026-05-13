import AppLayout from "./AppLayout";
import ThreeDVisualizerMenu from "../menus/ThreeDVisualizerMenu";
import { ProjectProvider } from "../context/ProjectContext";

function ThreeDVisualizerLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={ThreeDVisualizerMenu}>
        {children}
      </AppLayout>
    </ProjectProvider>
  );
}

export default ThreeDVisualizerLayout;