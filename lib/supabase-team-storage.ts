import { supabase } from "./supabase"
import type { Database } from "@/types/database"

type Team = Database["public"]["Tables"]["teams"]["Row"]
type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"]
type TeamUpdate = Database["public"]["Tables"]["teams"]["Update"]

export const supabaseTeamStorage = {
  async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase.from("teams").select("*").order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching teams:", error)
      return []
    }

    return data || []
  },

  async addTeam(team: Omit<TeamInsert, "id" | "created_at" | "updated_at">): Promise<Team | null> {
    const { data, error } = await supabase
      .from("teams")
      .insert({
        ...team,
        member_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding team:", error)
      return null
    }

    return data
  },

  async updateTeam(id: string, updates: Partial<TeamUpdate>): Promise<Team | null> {
    const { data, error } = await supabase.from("teams").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating team:", error)
      return null
    }

    // 팀 이름이 변경된 경우 해당 팀 소속 구성원들의 team_name도 업데이트
    if (updates.name) {
      await supabase.from("members").update({ team_name: updates.name }).eq("team_id", id)
    }

    return data
  },

  async deleteTeam(id: string): Promise<boolean> {
    const { error } = await supabase.from("teams").delete().eq("id", id)

    if (error) {
      console.error("Error deleting team:", error)
      return false
    }

    return true
  },

  async isTeamNameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = supabase.from("teams").select("id").eq("name", name)

    if (excludeId) {
      query = query.neq("id", excludeId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error checking team name:", error)
      return false
    }

    return (data?.length || 0) > 0
  },

  async updateTeamMemberCounts(): Promise<void> {
    const { data: teams } = await supabase.from("teams").select("id")

    if (!teams) return

    for (const team of teams) {
      // 활성 구성원만 카운트
      const { count } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "active") // 활성 구성원만 카운트

      await supabase
        .from("teams")
        .update({ member_count: count || 0 })
        .eq("id", team.id)
    }
  },
}
