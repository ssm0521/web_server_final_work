"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SystemSettings } from "@/lib/system-settings"

export default function SystemSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [settings, setSettings] = useState<SystemSettings>({
    defaultMaxAbsent: 3,
    defaultLateToAbsent: 3,
    maxFileSize: 10 * 1024 * 1024,
    allowedFileTypes: [],
    enableNotifications: true,
    notificationRetentionDays: 30,
    sessionTimeoutMinutes: 30,
    attendanceCodeLength: 4,
    siteName: "학교 출석 관리 시스템",
    siteDescription: "학과/학기/과목 단위 출석 관리 시스템",
    maintenanceMode: false,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/system-settings")
      if (!response.ok) {
        throw new Error("시스템 설정을 불러올 수 없습니다")
      }
      const data = await response.json()
      setSettings(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const response = await fetch("/api/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "저장에 실패했습니다")
      }

      setSuccess("시스템 설정이 저장되었습니다")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <a
            href="/admin"
            className="text-blue-600 hover:text-blue-800"
          >
            ← 관리자 대시보드로
          </a>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">시스템 설정</h1>
          <p className="mt-2 text-gray-600">시스템 전반의 설정을 관리할 수 있습니다</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 출석 정책 기본값 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">출석 정책 기본값</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  기본 최대 결석 횟수
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.defaultMaxAbsent}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultMaxAbsent: parseInt(e.target.value) || 3 })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">강의 생성 시 기본값으로 사용됩니다</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  지각 몇 회 = 결석 1회
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.defaultLateToAbsent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultLateToAbsent: parseInt(e.target.value) || 3,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">지각 횟수 전환 기준</p>
              </div>
            </div>
          </div>

          {/* 파일 업로드 설정 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">파일 업로드 설정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  최대 파일 크기
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1024}
                    max={100 * 1024 * 1024}
                    step={1024}
                    value={settings.maxFileSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxFileSize: parseInt(e.target.value) || 10 * 1024 * 1024,
                      })
                    }
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <span className="text-sm text-gray-500">
                    ({formatFileSize(settings.maxFileSize)})
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  허용된 파일 타입
                </label>
                <textarea
                  rows={4}
                  value={settings.allowedFileTypes.join(", ")}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowedFileTypes: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter((t) => t.length > 0),
                    })
                  }
                  placeholder="예: image/jpeg, image/png, application/pdf"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  MIME 타입을 쉼표로 구분하여 입력하세요
                </p>
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">알림 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    알림 활성화
                  </label>
                  <p className="text-xs text-gray-500">시스템 알림 기능을 활성화합니다</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) =>
                      setSettings({ ...settings, enableNotifications: e.target.checked })
                    }
                    className="rounded"
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  알림 보관 기간 (일)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.notificationRetentionDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notificationRetentionDays: parseInt(e.target.value) || 30,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">이 기간이 지난 알림은 자동 삭제됩니다</p>
              </div>
            </div>
          </div>

          {/* 세션 설정 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">세션 설정</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  세션 타임아웃 (분)
                </label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sessionTimeoutMinutes: parseInt(e.target.value) || 30,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">로그인 세션 유지 시간</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  인증번호 길이
                </label>
                <input
                  type="number"
                  min={3}
                  max={8}
                  value={settings.attendanceCodeLength}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      attendanceCodeLength: parseInt(e.target.value) || 4,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">출석 인증번호 자릿수</p>
              </div>
            </div>
          </div>

          {/* 사이트 설정 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">사이트 설정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">사이트 이름</label>
                <input
                  type="text"
                  maxLength={100}
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">사이트 설명</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={settings.siteDescription}
                  onChange={(e) =>
                    setSettings({ ...settings, siteDescription: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">점검 모드</label>
                  <p className="text-xs text-gray-500">
                    점검 모드 활성화 시 일반 사용자 접근이 제한됩니다
                  </p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) =>
                      setSettings({ ...settings, maintenanceMode: e.target.checked })
                    }
                    className="rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={fetchSettings}
              className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

