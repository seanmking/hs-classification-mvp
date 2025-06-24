'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'
import React from 'react'

interface GRIRule {
  id: string
  name: string
  description: string
  order: number
  mandatory: boolean
  legalText?: string
}

interface GRIStepProps {
  currentRule: GRIRule
  progress: {
    completed: string[]
    current: string
    remaining: string[]
    completionPercentage: number
  }
}

export function GRIStep({ currentRule, progress }: GRIStepProps) {
  const [showDetails, setShowDetails] = useState(false)

  // All GRI rules in order
  const allRules = [
    { id: 'pre_classification', name: 'Pre-Classification', order: 0 },
    { id: 'gri_1', name: 'GRI 1', order: 1 },
    { id: 'gri_2a', name: 'GRI 2(a)', order: 2 },
    { id: 'gri_2b', name: 'GRI 2(b)', order: 3 },
    { id: 'gri_3a', name: 'GRI 3(a)', order: 4 },
    { id: 'gri_3b', name: 'GRI 3(b)', order: 5 },
    { id: 'gri_3c', name: 'GRI 3(c)', order: 6 },
    { id: 'gri_4', name: 'GRI 4', order: 7 },
    { id: 'gri_5a', name: 'GRI 5(a)', order: 8 },
    { id: 'gri_5b', name: 'GRI 5(b)', order: 9 },
    { id: 'gri_6', name: 'GRI 6', order: 10 },
    { id: 'validation', name: 'Validation', order: 11 }
  ]

  const getRuleStatus = (ruleId: string) => {
    if (progress.completed.includes(ruleId)) return 'completed'
    if (progress.current === ruleId) return 'current'
    if (progress.remaining.includes(ruleId)) return 'pending'
    return 'skipped'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return React.createElement(CheckCircle2, { className: "w-5 h-5 text-green-600" })
      case 'current':
        return React.createElement(Clock, { className: "w-5 h-5 text-blue-600 animate-pulse" })
      case 'pending':
        return React.createElement(Circle, { className: "w-5 h-5 text-gray-400" })
      case 'skipped':
        return React.createElement(Circle, { className: "w-5 h-5 text-gray-300" })
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'current':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      case 'skipped':
        return 'bg-gray-50 text-gray-400 border-gray-100'
      default:
        return ''
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">GRI Classification Progress</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-800 transition"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress.completionPercentage}%` }}
          />
        </div>
        <div className="absolute -top-1 text-xs text-gray-600 right-0">
          {progress.completionPercentage}% Complete
        </div>
      </div>

      {/* Current Step Highlight */}
      <div className="bg-white rounded-lg border-2 border-blue-300 p-4 mb-3 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {React.createElement(Clock, { className: "w-5 h-5 text-blue-600 animate-pulse" })}
              <h4 className="font-semibold text-gray-900">{currentRule.name}</h4>
              {currentRule.mandatory && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Mandatory
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{currentRule.description}</p>
            {currentRule.legalText && (
              <div className="mt-2 text-xs text-gray-500 italic">
                Legal Basis: {currentRule.legalText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Steps (collapsible) */}
      {showDetails && (
        <div className="space-y-2 mt-3">
          {allRules.map((rule) => {
            const status = getRuleStatus(rule.id)
            const isCurrent = rule.id === currentRule.id
            
            return (
              <div
                key={rule.id}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                  isCurrent ? 'ring-2 ring-blue-400 shadow-sm' : ''
                } ${getStatusColor(status)}`}
              >
                {getStatusIcon(status)}
                <span className={`text-sm font-medium ${
                  status === 'skipped' ? 'line-through' : ''
                }`}>
                  {rule.name}
                </span>
                {status === 'completed' && (
                  <span className="text-xs ml-auto">✓</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legal Warning */}
      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
        {React.createElement(AlertCircle, { className: "w-4 h-4 mt-0.5 flex-shrink-0" })}
        <span>
          Classification must follow GRI rules in sequential order as mandated by WCO guidelines.
          Skipping rules may result in legally invalid classifications.
        </span>
      </div>
    </div>
  )
}