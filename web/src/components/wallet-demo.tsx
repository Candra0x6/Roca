'use client'

import React from 'react'
import WalletConnect from '@/components/wallet-connect'
import { useWalletConnection } from '@/hooks/useWalletConnection'
import { usePoolStatistics } from '@/hooks/usePoolFactory'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function WalletDemo() {
  const { address, isConnected, chainInfo } = useWalletConnection()
  const { statistics, isLoading: isStatsLoading } = usePoolStatistics()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Arisan+ Wallet Demo {isConnected}</h1>
        <p className="text-white/70">Test wallet connection and smart contract integration</p>
      </div>

      {/* Wallet Connection Section */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Wallet Connection</CardTitle>
          <CardDescription>Connect your wallet to interact with smart contracts</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletConnect onConnectionChange={(connected, address) => {
            console.log('Connection changed:', { connected, address })
          }} />
        </CardContent>
      </Card>

      {/* Connection Status */}
      {isConnected && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Connection Status</CardTitle>
            <CardDescription>Your wallet connection details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-white/70">Status:</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                Connected
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-white/70">Network:</span>
              <Badge variant="outline" className="text-white/70 border-white/20">
                <div 
                  className="w-2 h-2 rounded-full mr-2" 
                  style={{ backgroundColor: chainInfo.color }}
                />
                {chainInfo.name}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/70">Address:</span>
              <code className="text-sm bg-neutral-800 px-2 py-1 rounded text-white/90">
                {address}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Contract Integration */}
      {isConnected && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Smart Contract Integration</CardTitle>
            <CardDescription>Test contract read operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Pool Statistics</h3>
              {isStatsLoading ? (
                <p className="text-white/70">Loading pool statistics...</p>
              ) : statistics ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{statistics.totalPools.toString()}</div>
                    <div className="text-sm text-white/70">Total Pools</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{statistics.activePools.toString()}</div>
                    <div className="text-sm text-white/70">Active Pools</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{statistics.completedPools.toString()}</div>
                    <div className="text-sm text-white/70">Completed Pools</div>
                  </div>
                </div>
              ) : (
                <p className="text-red-400">
                  Failed to load pool statistics. Make sure contracts are deployed on {chainInfo.name}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isConnected && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-6">
            <p className="text-center text-white/70">
              Connect your wallet to test smart contract integration
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
