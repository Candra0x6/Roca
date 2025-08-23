"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Users, Search } from "lucide-react"
import RevealOnView from "@/components/reveal-on-view"

interface GroupActionsProps {
  isConnected: boolean
  userGroups?: string[]
}

export default function GroupActions({ isConnected, userGroups = [] }: GroupActionsProps) {
  const [groupId, setGroupId] = useState("")

  const handleCreateGroup = () => {
    console.log("[v0] Creating new group...")
    // Implement group creation logic
  }

  const handleJoinGroup = () => {
    if (!groupId.trim()) return
    console.log("[v0] Joining group:", groupId)
    // Implement group joining logic
  }

  const handleViewGroups = () => {
    console.log("[v0] Viewing user groups:", userGroups)
    // Implement navigation to user groups
  }

  return (
    <div className="space-y-4">
      {/* Create Group */}
      <RevealOnView delay={0.1}>
        <Button
          onClick={handleCreateGroup}
          disabled={!isConnected}
          size="lg"
          className="w-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </RevealOnView>

      {/* Join Group */}
      <RevealOnView delay={0.2}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Group ID or Link"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={!isConnected}
              className="rounded-full border-white/20 bg-white/5 text-white placeholder:text-white/50"
            />
            <Button
              onClick={handleJoinGroup}
              disabled={!isConnected || !groupId.trim()}
              size="lg"
              variant="outline"
              className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleJoinGroup}
            disabled={!isConnected || !groupId.trim()}
            size="lg"
            variant="outline"
            className="w-full rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
          >
            Join Group
          </Button>
        </div>
      </RevealOnView>

      {/* View My Groups - only show if connected and has groups */}
      {isConnected && (
        <RevealOnView delay={0.3}>
          <Button
            onClick={handleViewGroups}
            size="lg"
            variant="outline"
            className="w-full rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
          >
            <Users className="mr-2 h-4 w-4" />
            View My Groups {userGroups.length > 0 && `(${userGroups.length})`}
          </Button>
        </RevealOnView>
      )}
    </div>
  )
}
