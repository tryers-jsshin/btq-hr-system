"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { CsvParser } from "@/lib/csv-parser"
import { supabaseAttendanceStorage } from "@/lib/supabase-attendance-storage"
import type { CsvUploadResult } from "@/types/attendance"

interface AttendanceUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  uploadedBy: string
}

export function AttendanceUploadDialog({
  open,
  onOpenChange,
  onComplete,
  uploadedBy,
}: AttendanceUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CsvUploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError("CSV 파일만 업로드 가능합니다.")
        return
      }
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("파일을 선택해주세요.")
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // 1. CSV 파싱
      setProgress(20)
      const csvRows = await CsvParser.parseAttendanceCsv(file)
      
      // 2. 스냅샷 생성
      setProgress(40)
      const snapshot = await supabaseAttendanceStorage.createSnapshot(
        file.name,
        uploadedBy
      )
      
      // 3. 데이터 업로드
      setProgress(60)
      const uploadResult = await supabaseAttendanceStorage.uploadCsvData(
        snapshot.id,
        csvRows,
        uploadedBy
      )
      
      setProgress(100)
      setResult(uploadResult)
      
      // 성공 메시지 표시 후 자동 닫기
      if (uploadResult.errors.length === 0) {
        setTimeout(() => {
          onComplete()
        }, 2000)
      }
    } catch (error) {
      console.error("업로드 오류:", error)
      setError(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.")
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      setResult(null)
      setError(null)
      setProgress(0)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader>
          <DialogTitle className="text-left text-[#0a0b0c]">
            출퇴근 CSV 업로드
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 파일 선택 */}
          <div className="border-2 border-dashed rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    CSV 파일을 선택하거나 드래그하세요
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              </div>
              {file && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-sm text-gray-500">
                    ({(file.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CSV 형식 안내 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">CSV 파일 형식:</p>
                <p className="text-sm">필수 헤더: 사원번호, 이름, 근무일자, 출근, 퇴근</p>
                <p className="text-sm">날짜 형식: YYYY/MM/DD 또는 YYYY-MM-DD</p>
                <p className="text-sm">시간 형식: HH:mm (예: 09:00, 18:30)</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 업로드 정책 */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-1">
                <p className="font-medium">업로드 정책:</p>
                <ul className="text-sm list-disc list-inside">
                  <li>신규 레코드는 추가됩니다</li>
                  <li>비어있던 출퇴근 시간은 채워집니다</li>
                  <li>이미 기록된 데이터는 덮어쓰지 않습니다</li>
                  <li>근무표와 자동 매칭되어 지각/초과근무가 계산됩니다</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* 진행 상태 */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-gray-600">
                업로드 중... {progress}%
              </p>
            </div>
          )}

          {/* 오류 메시지 */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 업로드 결과 */}
          {result && (
            <Alert className={result.errors.length > 0 ? "bg-[#fff7ed] border-[#fed7aa]" : "bg-[#f0fdf4] border-[#bbf7d0]"}>
              {result.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4 text-[#ea580c]" />
              ) : (
                <CheckCircle className="h-4 w-4 text-[#16a34a]" />
              )}
              <AlertDescription className="text-[#4a5568]">
                <div className="space-y-2">
                  <p className="font-medium text-[#0a0b0c]">업로드 완료</p>
                  <div className="text-sm space-y-1">
                    <p>• 전체 행: {result.total_rows}개</p>
                    <p>• 처리됨: {result.processed_rows}개</p>
                    <p>• 신규 추가: {result.new_records}개</p>
                    <p>• 업데이트: {result.updated_records}개</p>
                    <p>• 건너뜀: {result.skipped_records}개</p>
                  </div>
                  
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-[#ea580c]">오류 목록:</p>
                      <div className="max-h-32 overflow-y-auto text-sm">
                        {result.errors.map((err, idx) => (
                          <p key={idx} className="text-[#dc2626]">
                            • {err.row}행: {err.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            {result ? "닫기" : "취소"}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "업로드 중..." : "업로드"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}