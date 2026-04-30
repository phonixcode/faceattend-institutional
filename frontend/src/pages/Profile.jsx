import { useState } from 'react'
import { User, Lock, Save } from 'lucide-react'
import { authApi } from '../services/api'
import { Page, Card, Button, Input } from '../components/ui'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const isStudent = user?.role === 'STUDENT'

  const [nameForm, setNameForm] = useState({ full_name: user?.full_name || '' })
  const [pwForm,   setPwForm]   = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [savingName, setSavingName] = useState(false)
  const [savingPw,   setSavingPw]   = useState(false)

  const updateFn = isStudent ? authApi.updateProfileStudent : authApi.updateProfile

  const handleNameSave = async (e) => {
    e.preventDefault()
    if (!nameForm.full_name.trim()) return
    setSavingName(true)
    try {
      const { data } = await updateFn({ full_name: nameForm.full_name.trim() })
      updateUser({ full_name: data.full_name })
      toast.success('Name updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (pwForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSavingPw(true)
    try {
      await updateFn({
        current_password: pwForm.current_password,
        new_password    : pwForm.new_password,
      })
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <Page title="Profile Settings" subtitle="Update your name and password">
      <div className="max-w-lg space-y-6">

        {/* Personal info */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <User size={16} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Personal Information</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <form onSubmit={handleNameSave} className="space-y-4">
            <Input
              label="Full Name"
              value={nameForm.full_name}
              onChange={e => setNameForm({ full_name: e.target.value })}
              placeholder="Your full name"
              required
            />
            <Button type="submit" loading={savingName} size="sm">
              <Save size={13} /> Save Name
            </Button>
          </form>
        </Card>

        {/* Change password */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <Lock size={16} className="text-gray-500" />
            </div>
            <p className="text-sm font-bold text-gray-800">Change Password</p>
          </div>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={pwForm.current_password}
              onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
              placeholder="Enter current password"
              required
            />
            <Input
              label="New Password"
              type="password"
              value={pwForm.new_password}
              onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
              placeholder="At least 8 characters"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={pwForm.confirm_password}
              onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              placeholder="Repeat new password"
              required
            />
            <Button type="submit" loading={savingPw} size="sm">
              <Lock size={13} /> Change Password
            </Button>
          </form>
        </Card>

      </div>
    </Page>
  )
}
