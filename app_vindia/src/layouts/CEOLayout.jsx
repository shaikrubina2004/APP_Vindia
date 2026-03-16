import AppLayout from "./AppLayout";
import { ceoMenu } from "../menus/ceoMenu";

function CEOLayout({ children }) {

  return (
    <AppLayout menuItems={ceoMenu}>
      {children}
    </AppLayout>

  );
}

export default CEOLayout;