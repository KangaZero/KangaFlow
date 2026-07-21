"use client"

import {
  BellIcon,
  CalculatorIcon,
  CalendarIcon,
  ClipboardPasteIcon,
  CodeIcon,
  CopyIcon,
  CreditCardIcon,
  FolderPlusIcon,
  HelpCircleIcon,
  ImageIcon,
  LayoutGridIcon,
  ListIcon,
  type LucideIcon,
  PlusIcon,
  ScissorsIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { IS_MAC } from "@/lib/shortcuts"
import { useGlobalStates } from "@/providers/global-state-provider"

type CommandItemDef = {
  name: string
  shortcut: {
    hasMetaOrCtrlKey: boolean
    hasAltOrOptionKey: boolean
    hasShiftKey: boolean
    character: null | string // grapheme length must be 1
  }
  icon: LucideIcon
}

type CommandMenuProps = {
  // Open state comes from GlobalStatesProvider; `commands` is optional so the
  // menu can be dropped in bare (e.g. from the server layout).
  commands?: CommandItemDef[]
}

export const CommandMenu = ({ commands = [] }: CommandMenuProps) => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useGlobalStates()
  if (!isCommandPaletteOpen) return null

  //TODO move this to where settings is applied
  const graphemeLength = (grapheme: string): number => {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    return [...segmenter.segment(grapheme.trim())].length
  }

  const shortcutsToLabel = (shortcut: CommandItemDef["shortcut"]): string => {
    if (!shortcut.character) return ""
    const shortcutAsLabel: string[] = []
    if (shortcut.hasMetaOrCtrlKey) shortcutAsLabel.push(IS_MAC ? "⌘" : "Ctrl")
    if (shortcut.hasAltOrOptionKey) shortcutAsLabel.push(IS_MAC ? "⌥" : "Alt")
    if (shortcut.hasShiftKey) shortcutAsLabel.push(IS_MAC ? "⌘" : "Shift")
    shortcutAsLabel.push(shortcut.character.toUpperCase())
    return shortcutAsLabel.join(IS_MAC ? "" : " + ")
  }

  const commandsSanitized: CommandItemDef[] = commands.map((command) => {
    const shortcutCharacter = command.shortcut.character
    if (!shortcutCharacter || graphemeLength(shortcutCharacter) > 1)
      command.shortcut.character = null
    return command
  })

  return (
    <CommandDialog
      onOpenChange={setIsCommandPaletteOpen}
      open={isCommandPaletteOpen}
    >
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {commandsSanitized.map(({ name, icon: Icon, shortcut }) => (
              <CommandItem key={name}>
                <Icon />
                <span>{name}</span>
                <CommandShortcut>{shortcutsToLabel(shortcut)}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem>
              <PlusIcon />
              <span>New File</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <FolderPlusIcon />
              <span>New Folder</span>
              <CommandShortcut>⇧⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CopyIcon />
              <span>Copy</span>
              <CommandShortcut>⌘C</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <ScissorsIcon />
              <span>Cut</span>
              <CommandShortcut>⌘X</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <ClipboardPasteIcon />
              <span>Paste</span>
              <CommandShortcut>⌘V</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <TrashIcon />
              <span>Delete</span>
              <CommandShortcut>⌫</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="View">
            <CommandItem>
              <LayoutGridIcon />
              <span>Grid View</span>
            </CommandItem>
            <CommandItem>
              <ListIcon />
              <span>List View</span>
            </CommandItem>
            <CommandItem>
              <ZoomInIcon />
              <span>Zoom In</span>
              <CommandShortcut>⌘+</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <ZoomOutIcon />
              <span>Zoom Out</span>
              <CommandShortcut>⌘-</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem>
              <UserIcon />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CreditCardIcon />
              <span>Billing</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <SettingsIcon />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <BellIcon />
              <span>Notifications</span>
            </CommandItem>
            <CommandItem>
              <HelpCircleIcon />
              <span>Help & Support</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tools">
            <CommandItem>
              <CalculatorIcon />
              <span>Calculator</span>
            </CommandItem>
            <CommandItem>
              <CalendarIcon />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem>
              <ImageIcon />
              <span>Image Editor</span>
            </CommandItem>
            <CommandItem>
              <CodeIcon />
              <span>Code Editor</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
