'use client'

import { motion } from 'framer-motion'

export default function SkeletonLoader() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Animated skeleton elements */}
        <div className="space-y-6">
          {/* Code skeleton */}
          <div className="text-center">
            <motion.div
              className="h-12 w-32 bg-gray-200 rounded-lg mx-auto mb-3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="h-6 w-64 bg-gray-200 rounded mx-auto"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>

          {/* Progress stages */}
          <div className="space-y-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '30%' }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <motion.div
                  className="w-3 h-3 bg-white rounded-full"
                  animate={{ scale: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
              <span className="text-sm text-gray-600">Analyzing product...</span>
            </motion.div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
              <span className="text-sm text-gray-400">Finding best matches...</span>
            </motion.div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '90%' }}
              transition={{ duration: 0.5, delay: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
              <span className="text-sm text-gray-400">Verifying compliance...</span>
            </motion.div>
          </div>

          {/* Description skeleton */}
          <div className="space-y-3 pt-6">
            <motion.div
              className="h-4 bg-gray-200 rounded w-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.div
              className="h-4 bg-gray-200 rounded w-4/5"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
            <motion.div
              className="h-4 bg-gray-200 rounded w-3/5"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Helpful text */}
      <motion.p
        className="text-center text-sm text-gray-500 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        This usually takes 5-10 seconds...
      </motion.p>
    </div>
  )
}