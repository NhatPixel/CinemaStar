import { Outlet } from 'react-router-dom'
import { AdminSidebar, AppFooter } from '..'
import { PAGE_SHELL_STACK, PAGE_SIDEBAR_ROW } from '../../constants/pageLayout'

function ManagementLayout() {
  return (
    <div className={PAGE_SHELL_STACK}>
      <div className={PAGE_SIDEBAR_ROW}>
        <AdminSidebar />
        <Outlet />
      </div>
      <AppFooter />
    </div>
  )
}

export default ManagementLayout
